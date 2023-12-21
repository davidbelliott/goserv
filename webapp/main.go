package main

import (
    "fmt"
    "flag"
    "strings"
    "strconv"
    "log"
    "encoding/json"
    "io"
    "io/ioutil"
    "os"
    "os/exec"
    "github.com/gomarkdown/markdown"
    "github.com/gomarkdown/markdown/html"
    "github.com/gomarkdown/markdown/parser"
    "github.com/gomarkdown/markdown/ast"
    "github.com/gernest/front"
    "html/template"
    "net"
    "net/http"
    "net/http/fcgi"
    "regexp"
    "errors"
    "bytes"
    "time"
)

const valid_users_user_col = 0
const valid_users_password_col = 1

const matrix_domain = "deadfacade.net"
const matrix_spawnpit_room_id = "!pJKKUIuGOwrLtmcEPc:deadfacade.net"
const index_name = "index"
const notfound_name = "notfound"
const template_dir = "templates"
const default_template_name = "layout.html"
const default_css_name = "style.css"

const static_url = "static"
const static_img_url = "img"
const static_css_url = "css"
const static_txt_url = "txt"
const img_url = static_url + "/" + static_img_url
const css_url = static_url + "/" + static_css_url
const txt_url = static_url + "/" + static_txt_url

var bible_versions = []string{"kjv", "cuv"}
const default_bible_version = "kjv"

const root_name = "home"

type Page struct {
    Body template.HTML
    Head template.HTML
    Links [][2]string
}

type SignupPage struct {
    Page
    Homeserver string
    Username string
    Error error
}

type BiblePage struct {
    Page
    AllVersions []string
    DisplayVersions []string
    BookName [2]string
    Chapter int
    LinksBookName [2][2]string
    LinksChapter [2]int
    BookNumChaps map[string]int
    BookOrder [][2]string
    RemoveLinks []string
    Verses [][]string
}

type Book struct {
    NameShort string        `json:"name_short"`
    NameLong string         `json:"name_long"`
    Chapters [][]string     `json:"chapters"`
}

type Bible struct {
    BookOrder []string      `json:"book_order"`
    Books map[string]Book   `json:"books"`
}

var opts html.RendererOptions
var extensions = parser.CommonExtensions | parser.Footnotes | parser.Tables

func render_node_hook(w io.Writer, node ast.Node, entering bool) (ast.WalkStatus, bool) {
    v, ok := node.(*ast.Image)
    if ok {
        if entering {
            capt := ""
            capt_html := capt
            text, ok := v.Children[0].(*ast.Text)
            if ok {
                capt = string(text.Literal)
                renderer := html.NewRenderer(opts)
                parse := parser.NewWithExtensions(extensions)
                capt_html = strings.TrimSuffix(strings.TrimPrefix(string(markdown.ToHTML(text.Literal, parse, renderer)), "<p>"), "</p>")
            }
            dest_url := "/" + img_url + "/" + string(v.Destination)
            fmt.Fprintf(w, "<figure>\n\t<img src=\"%s\" alt=\"%s\">\n\t<figcaption>%s</figcaption>\n</figure>", dest_url, capt, capt_html)
            return ast.SkipChildren, true
        } else {
            return ast.GoToNext, true
        }
    } else {
        return ast.GoToNext, false
    }
}

func do_matrix_request(matrix_domain, auth_token, method, endpoint string, req_body io.Reader) (map[string]interface{}, error) {
    client := &http.Client{
        CheckRedirect: nil,
    }
    http.Get("https://" + matrix_domain)
    req, err := http.NewRequest(method, "https://" + matrix_domain + endpoint, req_body)
    if err != nil {
        return nil, err
    }
    req.Header.Add("Authorization", "Bearer " + auth_token)
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }
    var result map[string]interface{}
    json.Unmarshal(body, &result)
    return result, nil
}

func get_matrix_rooms(matrix_domain, auth_token string) {
    result, _ := do_matrix_request(matrix_domain, auth_token, "GET", "/_synapse/admin/v1/rooms", nil)
    fmt.Println(result)
}

func place_user_in_room(matrix_domain, auth_token, user_id, room_id string) error {
    var body = map[string]string {"user_id": user_id}
    b := new(bytes.Buffer)
    enc := json.NewEncoder(b)
    err := enc.Encode(&body)
    if err != nil {
        return err
    }
    _, err = do_matrix_request(matrix_domain, auth_token, "POST", "/_synapse/admin/v1/join/" + room_id, b)
    return err
}

func get_matrix_accounts(matrix_domain, auth_token string) ([]string, error) {
    result, err := do_matrix_request(matrix_domain, auth_token, "GET", "/_synapse/admin/v2/users?guests=false", nil)
    fmt.Println("%s %s", result, err)
    if err != nil {
        return nil, err
    }
    users := result["users"].([]interface{})
    var usernames []string
    for _, user := range users {
        usernames = append(usernames,
            user.(map[string]interface{})["name"].(string))
    }
    return usernames, nil
}

func is_valid_user_localpart(localpart string) bool {
    is_valid := regexp.MustCompile("^[a-z0-9._=-]+$").MatchString(localpart)
    return is_valid
}

func create_matrix_account(matrix_domain, auth_token, username, password string) (string, error) {
    if !is_valid_user_localpart(username) {
        return "", errors.New("not a valid localpart")
    }
    existing_accounts, err := get_matrix_accounts(matrix_domain, auth_token)
    if err != nil {
        return "", errors.New("could not check against existing account names")
    }
    username_full := fmt.Sprintf("@%s:%s", username, matrix_domain)
    for _, v := range existing_accounts {
        if v == username_full {
            return "", errors.New("account with that name already exists")
        }
    }
    var body = map[string]string {"password": password}
    b := new(bytes.Buffer)
    enc := json.NewEncoder(b)
    err = enc.Encode(&body)
    if err != nil {
        return "", errors.New("request body encoding failed")
    }
    _, err = do_matrix_request(matrix_domain, auth_token, "PUT", "/_synapse/admin/v2/users/" + username_full, b)
    if err != nil {
        return "", errors.New("matrix user creation request failed")
    }
    return username_full, nil
}


func get_md_path(url_path string) (string, bool) {
    target_path := string(url_path[1:])
    // If directory requested, give the index
    if len(target_path) == 0 || target_path[len(target_path) - 1] == '/' {
        target_path += index_name
    } else {
        // Check for missing trailing slash in dirname, and redirect
        fi, err := os.Stat(fmt.Sprintf("%s/%s", template_dir, target_path))
        if err == nil && fi.Mode().IsDir() {
            // Directory was requested without trailing slash; return redirect URL
            return "", true
        }
    }
    md_path := fmt.Sprintf("%s/%s.md", template_dir, target_path)
    return md_path, false
}

func matrix_signup_handler(w http.ResponseWriter, r *http.Request) {
    if r.Method == http.MethodPost {
        fmt.Println("Signup handler")
        auth_bytes, _ := ioutil.ReadFile("matrix_access_token")
        get_matrix_accounts(matrix_domain, string(auth_bytes))
        r.ParseForm()
        usernames, username_ok := r.Form["username"]
        passwords, password_ok := r.Form["password"]
        if !(username_ok && password_ok && len(usernames) == 1 && len(passwords) == 1) {
            fmt.Println("Form submit bad request\n")
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        username := usernames[0]
        password := passwords[0]

        auth_str := strings.TrimSuffix(string(auth_bytes), "\n")
        full_username, creation_err := create_matrix_account(matrix_domain, auth_str, username, password)
        if creation_err == nil {
            place_user_in_room(matrix_domain, auth_str, full_username, matrix_spawnpit_room_id)
        }

        md_path, need_slash_redirect := get_md_path(r.URL.Path)
        if need_slash_redirect {
            http.Redirect(w, r, r.URL.Path + "/", http.StatusMovedPermanently)
            return
        }
        md, err := ioutil.ReadFile(md_path)
        if err != nil {
            fmt.Println(err)
            notfound(w, r)
            return
        }
        page, template_name := standard_page_from_md(string(md), r.URL.Path)
        t, err := get_template(template_name)
        if err != nil {
            internalerror(w)
            fmt.Println(err)
            return
        }
        signup_page := SignupPage{Page: page, Homeserver: matrix_domain, Username: username, Error: creation_err}
        t.Execute(w, &signup_page)
    } else {
        http.Redirect(w, r, "/matrix/", http.StatusSeeOther)
        return
    }
}

func standard_page_from_md(md string, path string) (Page, string) {
    fmt.Printf("%s: rendering page: %s\n", time.Now(), path)
    fm := front.NewMatter()
    fm.Handle("+++", front.YAMLHandler)
    template_name := default_template_name
    css_name := default_css_name
    f, body, err := fm.Parse(strings.NewReader(md))
    head := ""
    if err != nil {
        body = md
    } else {
        // Attempt to get template name from front matter
        template_name_fm, ok := f["template"]
        if ok {
            template_name = template_name_fm.(string)
        }
        // Attempt to get css path from front matter
        css_name_fm, ok := f["css"]
        if ok {
            css_name = css_name_fm.(string)
        }
    }
    if css_name != "" {
        head += fmt.Sprintf("<link rel=\"stylesheet\" type=\"text/css\" href=\"/%s/%s\">", css_url, css_name)
    }

    opts = html.RendererOptions{RenderNodeHook: render_node_hook, Flags: html.CommonFlags}
    parse := parser.NewWithExtensions(extensions)
    renderer := html.NewRenderer(opts)

    links := [][2]string{{root_name, "/"}}
    tokens := strings.Split(path, "/")
    link_url := ""
    for _, endpoint := range(tokens) {
        if len(endpoint) > 0 {
            link_url = link_url + "/" + endpoint
            links = append(links, [2]string{endpoint, link_url})
        }
    }
    page := Page{Body: template.HTML(markdown.ToHTML([]byte(body), parse, renderer)), Links: links, Head: template.HTML(head)}
    return page, template_name
}

func notfound(w http.ResponseWriter, r *http.Request) {
    md, err := ioutil.ReadFile(fmt.Sprintf("%s/%s.md", template_dir, notfound_name))
    if err != nil {
        http.NotFound(w, r)
        return
    }
    w.WriteHeader(http.StatusNotFound)
    page, template_name := standard_page_from_md(string(md), r.URL.Path)
    t, err := get_template(template_name)
    if err != nil {
        internalerror(w)
        return
    }
    t.Execute(w, &page)
}

func internalerror(w http.ResponseWriter) {
    http.Error(w, "Internal server error", http.StatusInternalServerError)
}

func get_template(template_name string) (*template.Template, error) {
    template_path := fmt.Sprintf("%s/%s", template_dir, template_name)
    return template.New(template_name).Funcs(template.FuncMap{
            "inc": func(i int) int {
                return i + 1
            },
        }).ParseFiles(template_path)
}

func bible_handler(w http.ResponseWriter, r *http.Request) {
    // Get URL path parameters
    split_fn := func(c rune) bool {
        return c == '/'
    }
    url_tokens := strings.FieldsFunc(r.URL.Path, split_fn)
    if len(url_tokens) <= 1 {
        http.Redirect(w, r, "/bible/genesis/1", http.StatusMovedPermanently)
        return
    } else if len(url_tokens) == 2 {
        http.Redirect(w, r, r.URL.Path + "/1", http.StatusMovedPermanently)
        return
    }
    fmt.Printf("%s / %s\n", url_tokens[1], url_tokens[2])
    book_name := url_tokens[1]
    ch_num, err := strconv.Atoi(url_tokens[2])
    if err != nil {
        notfound(w, r)
        return
    }
    ch_idx := ch_num - 1

    // Get URL query parameters
    version_params, ok := r.URL.Query()["v"]
    disp_versions := []string{}
    for _, request_version := range version_params {
        is_valid := false
        for _, v := range bible_versions {
            if request_version == v {
                is_valid = true
                break
            }
        }
        if is_valid {
            disp_versions = append(disp_versions, request_version)
        }
    }
    if !ok || len(disp_versions) == 0 {
        http.Redirect(w, r, "/bible/" + book_name + "/" + strconv.Itoa(ch_num) +
            "?v=" + default_bible_version, http.StatusMovedPermanently)
        return
    }


    md, err := ioutil.ReadFile(fmt.Sprintf("%s/bible.md", template_dir))
    if err != nil {
        fmt.Println(err)
        notfound(w, r)
        return
    }

    s_page, template_name := standard_page_from_md(string(md), r.URL.Path)
    t, err := get_template(template_name)
    if err != nil {
        internalerror(w)
        fmt.Println(err)
        return
    }

    verses := make([][]string, 0)

    book_order := [][2]string{}
    num_chaps := map[string]int{}
    book_name_human := book_name
    links_book_name := [2][2]string{{"", ""}, {"", ""}}
    links_ch_num := [2]int{0, 0}
    for i, v := range disp_versions {
        fmt.Println(v)
        content, err := ioutil.ReadFile(v + ".json")
        if err != nil {
            internalerror(w)
            fmt.Println(err)
            return
        }

        var bible Bible
        err = json.Unmarshal(content, &bible)
        if err != nil {
            fmt.Println("error")
            internalerror(w)
            fmt.Println(err)
            return
        }
        if i == 0 {
            book_name_human = bible.Books[book_name].NameShort
            for j, b := range bible.BookOrder {
                book_order = append(book_order, [2]string{b, bible.Books[b].NameShort})
                num_chaps[b] = len(bible.Books[b].Chapters)
                if b == book_name {
                    if ch_num > 1 {
                        links_ch_num[0] = ch_num - 1
                        links_book_name[0] = [2]string{book_name, book_name_human}
                    } else if j > 0 {
                        links_ch_num[0] = num_chaps[book_order[j - 1][0]]
                        links_book_name[0] = [2]string{bible.BookOrder[j - 1],
                            bible.Books[bible.BookOrder[j - 1]].NameShort}
                    }
                    if ch_num < num_chaps[b] {
                        links_ch_num[1] = ch_num + 1
                        links_book_name[1] = [2]string{book_name,
                            book_name_human}
                    } else if j + 1 < len(bible.BookOrder) {
                        links_ch_num[1] = 1
                        links_book_name[1] = [2]string{bible.BookOrder[j + 1],
                            bible.Books[bible.BookOrder[j + 1]].NameShort}
                    } else {
                        fmt.Printf("%d %d\n", j + 1, ch_num);
                        fmt.Printf("%d\n", len(book_order));
                        fmt.Println(book_order);
                    }
                }
            }
        }

        if book, book_ok := bible.Books[book_name]; book_ok {
            if ch_idx >= 0 && ch_idx < len(book.Chapters) {
                verses = append(verses, book.Chapters[ch_idx])
            } else {
                notfound(w, r)
                return
            }
        } else {
            notfound(w, r)
            return
        }
    }
    max_num_verses := 0
    for _, v := range verses {
        if len(v) > max_num_verses {
            max_num_verses = len(v)
        }
    }

    verses_disp := make([][]string, max_num_verses)
    for i := 0; i < max_num_verses; i++ {
        verses_disp[i] = make([]string, len(verses))
        for j := 0; j < len(verses); j++ {
            if i < len(verses[j]) {
                verses_disp[i][j] = verses[j][i]
            } else {
                verses_disp[i][j] = ""
            }
        }
    }

    remove_links := make([]string, len(disp_versions))
    for i := 0; i < len(disp_versions); i++ {
        link := fmt.Sprintf("/bible/%s/%d?v=", book_name, ch_num)
        for j, v_link := range disp_versions {
            if j == i {
                continue
            }
            link += v_link
            // If we still have at least one more version to keep after this
            if j < len(disp_versions) - 1 &&
                (i != len(disp_versions) - 1 || j + 1 != i) {
                link += "&v="
            }
        }
        fmt.Println(r.URL.Path)
        link += r.URL.Fragment
        remove_links[i] = link
    }

    page := BiblePage{
                Page: s_page,
                AllVersions: bible_versions,
                DisplayVersions: disp_versions,
                BookName: [2]string{book_name, book_name_human},
                Chapter: ch_num,
                LinksBookName: links_book_name,
                LinksChapter: links_ch_num,
                BookOrder: book_order,
                BookNumChaps: num_chaps,
                RemoveLinks: remove_links,
                Verses: verses_disp}

    if err = t.Execute(w, &page); err != nil {
        fmt.Println(err)
    }
}

func todo_do_handler(w http.ResponseWriter, r *http.Request) {
    items, ok := r.URL.Query()["i"]
    if ok && len(items) > 0 {
        args := append([]string{"-x"}, items...)
        cmd := exec.Command("todo", args...)
        _, err := cmd.Output()
        if err != nil {
            fmt.Println(err)
        }
    }
    http.Redirect(w, r, "/todo", http.StatusSeeOther)
}

func todo_handler(w http.ResponseWriter, r *http.Request) {
    if r.Method == http.MethodPost {
        fmt.Println("Todo POST handler")
        r.ParseForm()
        items, ok := r.Form["item-todo"]
        if !(ok && len(items) == 1) {
            fmt.Println("Form submit bad request\n")
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        item := items[0]
        cmd := exec.Command("todo", item)
        _, err := cmd.Output()
        if err != nil {
            fmt.Println(err)
        }
    }
    //cmd := exec.Command("update-latest")
    show_page_at_url(r.URL.Path, w, r)
}

func show_page_at_url(url_path string, w http.ResponseWriter, r *http.Request) {
    md_path, need_slash_redirect := get_md_path(url_path)
    if need_slash_redirect {
        http.Redirect(w, r, r.URL.Path + "/", http.StatusMovedPermanently)
        return
    }

    md, err := ioutil.ReadFile(md_path)
    if err != nil {
        fmt.Println(err)
        notfound(w, r)
        return
    }
    page, template_name := standard_page_from_md(string(md), r.URL.Path)
    t, err := get_template(template_name)
    if err != nil {
        internalerror(w)
        fmt.Println(err)
        return
    }
    t.Execute(w, &page)
}

func handler(w http.ResponseWriter, r *http.Request) {
    show_page_at_url(r.URL.Path, w, r)
}

var (
    local = flag.String("local", "", "serve as webserver, example: 0.0.0.0:8000")
    tcp   = flag.String("tcp", "", "serve as FCGI via TCP, example: 0.0.0.0:8000")
    unix  = flag.String("unix", "", "serve as FCGI via UNIX socket, example: /tmp/myprogram.sock")
)

func main() {
    flag.Parse()
    r := http.DefaultServeMux
    r.HandleFunc("/bible/", bible_handler)  // trailing slash: handle all sub-paths
    r.HandleFunc("/", handler)
    fs := http.FileServer(http.Dir("./static"))
    r.Handle("/static/", http.StripPrefix("/static/", fs))
    var err error
    if *local != "" { // Run as a local web server
        err = http.ListenAndServe(*local, r)
    } else if *tcp != "" {  // Run as FCGI via TCP
        listener, err := net.Listen("tcp", *tcp)
        if err != nil {
            log.Fatal(err)
        }
        defer listener.Close()
        err = fcgi.Serve(listener, r)
    } else if *unix != "" { // Run as FCGI via Unix socket
        listener, err := net.Listen("unix", *unix)
        if err != nil {
            log.Fatal(err)
        }
        defer listener.Close()
        err = fcgi.Serve(listener, r)
    } else {    // Run as FCGI via standard I/O
        err = fcgi.Serve(nil, r)
    }
    if err != nil {
        log.Fatal(err)
    }
}

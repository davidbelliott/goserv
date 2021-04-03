package main

import (
    "fmt"
    "flag"
    "strings"
    "log"
    "encoding/json"
    "io"
    "io/ioutil"
    "os"
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
)

const matrix_domain = "moraine.dev"
const matrix_spawnpit_room_id = "!pJKKUIuGOwrLtmcEPc:moraine.dev"
const index_name = "index"
const notfound_name = "notfound"
const template_dir = "templates"
const default_template_name = "layout.html"
const default_css_name = "style.css"

const static_url = "static"
const static_img_url = "img"
const static_css_url = "css"
const img_url = static_url + "/" + static_img_url
const css_url = static_url + "/" + static_css_url

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
    return template.ParseFiles(template_path)
}

func handler(w http.ResponseWriter, r *http.Request) {
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
    t.Execute(w, &page)
}

var (
    local = flag.String("local", "", "serve as webserver, example: 0.0.0.0:8000")
    tcp   = flag.String("tcp", "", "serve as FCGI via TCP, example: 0.0.0.0:8000")
    unix  = flag.String("unix", "", "serve as FCGI via UNIX socket, example: /tmp/myprogram.sock")
)

func main() {
    flag.Parse()
    r := http.DefaultServeMux
    r.HandleFunc("/matrix/signup", matrix_signup_handler)
    r.HandleFunc("/", handler)
    r.Handle("/" + static_url + "/", http.StripPrefix("/" + static_url + "/", http.FileServer(http.Dir(static_url))))
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

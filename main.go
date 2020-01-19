package main

import (
    "fmt"
    "flag"
    "strings"
    "log"
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
)

const index_name = "index"
const template_dir = "templates"
const default_template_name = "layout"

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

func render_node_hook(w io.Writer, node ast.Node, entering bool) (ast.WalkStatus, bool) {
    if !entering {
        return ast.GoToNext, false
    }
    v, ok := node.(*ast.Image)
    if ok {
        capt := ""
        text, ok := v.Children[0].(*ast.Text)
        if ok {
            capt = string(text.Literal)
        }
        dest_url := "/" + img_url + "/" + string(v.Destination)
        fmt.Fprintf(w, "<figure>\n\t<img src=\"%s\" alt=\"%s\">\n\t<figcaption>%s</figcaption>\n</figure>", dest_url, capt, capt)
        return ast.SkipChildren, true
    } else {
        return ast.GoToNext, false
    }
}

func handler(w http.ResponseWriter, r *http.Request) {
    target_path := string(r.URL.Path[1:])
    // If directory requested, give the index
    if len(target_path) == 0 || target_path[len(target_path) - 1] == '/' {
        target_path += index_name
    } else {
        // Check for missing trailing slash in dirname, and redirect
        fi, err := os.Stat(fmt.Sprintf("%s/%s", template_dir, target_path))
        if err == nil && fi.Mode().IsDir() {
            // Directory was requested without trailing slash; redirect
            http.Redirect(w, r, r.URL.Path + "/", http.StatusMovedPermanently)
            return
        }
    }
    md_path := fmt.Sprintf("%s/%s.md", template_dir, target_path)
    md, err := ioutil.ReadFile(md_path)
    if err != nil {
        fmt.Println(err)
        http.NotFound(w, r)
        return
    }
    fm := front.NewMatter()
    fm.Handle("+++", front.YAMLHandler)
    template_name := default_template_name
    f, body, err := fm.Parse(strings.NewReader(string(md)))
    head := ""
    if err != nil {
        body = string(md)
    } else {
        // Attempt to get template name from front matter
        template_name_fm, ok := f["template"]
        if ok {
            template_name = template_name_fm.(string)
        }
        // Attempt to get css path from front matter
        css_name, ok := f["css"]
        if ok {
            head += "<link rel=\"stylesheet\" type=\"text/css\" href=\"/" + css_url + "/" + css_name.(string) + "\">"
        }
    }
    opts := html.RendererOptions{RenderNodeHook: render_node_hook}
    parse := parser.NewWithExtensions(parser.CommonExtensions | parser.Footnotes)
    renderer := html.NewRenderer(opts)

    links := [][2]string{{root_name, "/"}}
    tokens := strings.Split(r.URL.Path, "/")
    link_url := ""
    for _, endpoint := range(tokens) {
        if len(endpoint) > 0 {
            link_url = link_url + "/" + endpoint
            links = append(links, [2]string{endpoint, link_url})
        }
    }
    page := Page{Body: template.HTML(markdown.ToHTML([]byte(body), parse, renderer)), Links: links, Head: template.HTML(head)}

    template_path := fmt.Sprintf("%s/%s.html", template_dir, template_name)
    t, err := template.ParseFiles(template_path)
    if err != nil {
        http.Error(w, "Internal server error", http.StatusInternalServerError)
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

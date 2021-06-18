# DEADFACADE Matrix homeserver

Sign up for a [Matrix](https://matrix.org/) account hosted on this homeserver. You can use this account to join Matrix rooms both on and off the homeserver.

<html>

<form name="signupform" action="signup" method="post" onsubmit="return validate()">
Username:<br>
<input type="text" name="username"><br><br>
Password:<br>
<input type="password" name="password"><br><br>
<input type="submit" value="Register">
</form>

<script>
function clear_alerts() {
    var alerts = document.getElementById('alerts');
    alerts.innerHTML = '';
}

function flash(text) {
    var alerts = document.getElementById('alerts');
    a = document.createElement('div');
    a.className = 'alert';
    a.appendChild(document.createTextNode(text));
    alerts.appendChild(a);
    alerts.appendChild(document.createTextNode(' '));
}

function validate() {
    clear_alerts();
    var username = document.forms["signupform"]["username"].value;
    var password = document.forms["signupform"]["password"].value;
    var ret = true;
    if (username == "") {
        flash("username must be filled out");
        ret = false;
    }
    if (password == "") {
        flash("password must be filled out");
        ret = false;
    }
    let re_str = "^[a-z0-9._=-]+$";
    let re = new RegExp(re_str);
    if (!re.test(username)) {
        flash("username must match regex " + re_str);
        ret = false;
    }
    return ret;
}
</script>

</html>

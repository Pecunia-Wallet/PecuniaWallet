fetch("/csrf");

function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

const input = document.querySelector("#passphrase");
const btn = document.querySelector("#confirm");
input.addEventListener("input", () => {
    if (input.value && input.value.trim().length > 0)
        btn.classList.remove("button-next--disabled");
    else btn.classList.add("button-next--disabled");
});
btn.addEventListener("click", () => {
    if (btn.classList.contains("button-next--disabled")
        || btn.classList.contains("btn--loading")) return;
    btn.classList.add("btn--loading");

    const csrf = getCookie("XSRF-TOKEN");
    const headers = {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": csrf
    };

    fetch("/open", {
        method: "POST",
        body: JSON.stringify({
            mnemonic: input.value.trim(),
        }),
        headers: headers
    }).then(response => {
        if (response.status >= 400) {
            input.classList.add("error");
            btn.classList.remove("btn--loading");
        }
        else window.location.href = "/app/lock";
    })
});

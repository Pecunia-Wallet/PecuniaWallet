fetch("/csrf");

let step = 0;
let option = 0;
let dynamicContainer;

const siteKey = "0x4AAAAAAAS46b3zYqFgRxEr";
let captcha;
let loading = false;
let waitingForInteract = false;

String.prototype.toNode = function () {
    return new DOMParser().parseFromString(this, "text/html").body.children[0];
}

Node.prototype.toString = function () {
    const doc = new DOMParser().parseFromString("", "text/html");
    doc.body.appendChild(this);
    return doc.body.innerHTML;
}

function setPage(s, o) {
    const page = pages[s] instanceof Array ? pages[s][o] : pages[s];
    if (page.canActivate && !page.canActivate()) {
        return setPage(0, 0);
    }
    step = s;
    option = o;
    onCaptcha = [];
    render();
}


let templateData = new Proxy({}, {
    set: function (target, key, value) {
        if (key === "text" || key === "complementText") {
            value = value.trim().replaceAll(/\s+/g, " ");
            const counter = document.querySelector("#counter");
            counter.querySelector(".counter__now")
                .textContent = `${value.length || 0}`;
            if (value.length > +counter.querySelector(".counter__max").textContent)
                counter.classList.add("counter--error");
            else counter.classList.remove("counter--error");
        }
        target[key] = value;
    }
});

let complements;
let messages = [];
let id;

function copyId() {
    const elem = document.querySelector("#copy-id");
    navigator.clipboard.writeText(templateData.id);
    if (elem.textContent === "(copied!)") return;
    elem.textContent = "(copied!)";
    setTimeout(() => elem.textContent = "(copy)", 1500);
}

const pages = [
    {
        template: () =>
            `<div class="menu">
                <button class="btn btn--accent" onclick="setPage(1, 0)">Open new ticket</button>
                <button class="btn" onclick="setPage(1, 1)">Open existing ticket</button>
            </div>`.toNode(),
        name: "menu"
    },
    [
        {
            template: () =>
                `<div class="form" style="opacity: 0;">
                    <h1 class="form__title">Open a ticket</h1>
                    <div class="row">
                        <h2 class="form__subtitle">Description</h2>
                        <span class="counter" id="counter">
                            <span class="counter__now">${templateData.text ? templateData.text.length || 0 : 0}</span>
                            <span class="counter__divider">/</span>
                            <span class="counter__max">1000</span>
                        </span>
                    </div>
                    <div class="input">
                        <textarea class="input__textarea" id="text"
                                  oninput="templateData.text = this.value.trim()"
                        >${templateData.text || ''}</textarea>
                        <span class="input__hint">
                            Please enter the details of your request.
                            A member of our support staff will respond as soon as possible.
                        </span>
                    </div>
                    <div class="form__input email">
                        <h2 class="form__subtitle">Email <span class="little">(optional)</span></h2>
                        <input id="email" type="text" value="${templateData.email || ''}" 
                               oninput="templateData.email = this.value.trim()">
                    </div>
                    <div class="captcha" id="captcha"></div>
                    <button id="submit" class="form__button"
                            onclick="if (!loading) openTicket(this)">
                        <span class="loader"><span></span><span></span><span></span></span>
                        Open
                    </button>
                </div>`.toNode(),
            name: "open"
        },
        {
            template: () => {
                const node = `<div class="form">
                    <h1 class="form__title">Please enter your&nbsp;ticket&nbsp;ID:</h1>
                    <div class="form__input">
                        <input type="text" id="idInput">
                        <button id="access" class="form__button"
                                style="min-height: unset;padding: 10px 15px"
                                onclick="idBtnClicked(this)">
                            <span class="loader"><span></span><span></span><span></span></span>
                            Open
                        </button>
                    </div>
                </div>`.toNode();

                const queryParams = new URLSearchParams(window.location.search);
                if (queryParams.has("id") && queryParams.get("id").length >= 1) {
                    node.querySelector("#idInput").value = queryParams.get("id");

                    const location = window.location;
                    const params = new URLSearchParams(location.search);
                    params.delete("id");
                    const search = params.toString();
                    const url = location.origin + location.pathname + (search === "" ? "" : `?${search}`) + location.hash;
                    window.history.pushState({}, document.title, url);

                    idBtnClicked(node.querySelector("#access"));
                }

                const input = node.querySelector("#idInput");
                input.addEventListener("focus", input.select);

                return node;
            },
            name: "access"
        }
    ],
    [
        {
            template: () => `
                <div class="opened">
                    <h2>The ticket has been successfully opened.</h2>
                    <p>Please save the ticket ID: <span class="span" onclick="copyId()">${templateData.id}<span id="copy-id">(copy)</span></span>;
                    </p>
                    <p>You are able to return to the ticket at any time
                       on <a href="/about/support#access">this</a> page.</p>
                    <p>Alternatively, you can use the <a href="/about/support?id=${templateData.id}#access">shortcut</a>.</p>
                </div>`.toNode(),
            name: "opened",
            canActivate: () => {
                return !!templateData.id;
            }
        },
        {
            template: async () =>
                `<div class="messages-container">
                   <div class="messages__header">
                       <h1 class="title">Ticket view</h1>
                       <div class="title-buttons">
                            <button onclick="copyOpenedTicketId();this.classList.remove('copied');this.offsetHeight;this.classList.add('copied');"><svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"/><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/><g id="SVGRepo_iconCarrier"> <path d="M20.9983 10C20.9862 7.82497 20.8897 6.64706 20.1213 5.87868C19.2426 5 17.8284 5 15 5H12C9.17157 5 7.75736 5 6.87868 5.87868C6 6.75736 6 8.17157 6 11V16C6 18.8284 6 20.2426 6.87868 21.1213C7.75736 22 9.17157 22 12 22H15C17.8284 22 19.2426 22 20.1213 21.1213C21 20.2426 21 18.8284 21 16V15" stroke="#352957" stroke-width="1.5" stroke-linecap="round"/> <path d="M3 10V16C3 17.6569 4.34315 19 6 19M18 5C18 3.34315 16.6569 2 15 2H11C7.22876 2 5.34315 2 4.17157 3.17157C3.51839 3.82475 3.22937 4.69989 3.10149 6" stroke="#352957" stroke-width="1.5" stroke-linecap="round"/> </g></svg></button>
                            <button onclick="refreshMessages();this.classList.remove('active');this.offsetHeight;this.classList.add('active');"><svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3V8M3 8H8M3 8L6 5.29168C7.59227 3.86656 9.69494 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.71683 21 4.13247 18.008 3.22302 14" stroke="#2B2E4AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                       </div>
                    </div>
                   <div class="messages">
                        ${getMessagesHtml()}
                   </div>
                   ${await getComplementForm()}
                </div>`.toNode(),
            name: "ticket",
            canActivate: () => {
                return !!messages && messages.length > 0;
            }
        }
    ]
];

function copyOpenedTicketId() {
    navigator.clipboard.writeText(id);
}

let _complements;
const getComplementForm = async () => {
    await getComplements();
    return `<div class="form" id="form">
        <div class="row">
            <h2 class="form__subtitle" id="complements">${complements >= 0
        ? `Complements: ${complements}/5` : 'This ticket is closed.'}</h2>
            ${complements > 0 ? `<span class="counter" id="counter">
                <span class="counter__now">${templateData.complementText ? templateData.complementText.length || 0 : 0}</span>
                <span class="counter__divider">/</span>
                <span class="counter__max">1000</span>
            </span>` : ''}
        </div>
        ${complements > 0 ? `<div class="input" style="margin-bottom: 0">
            <textarea class="input__textarea" id="text"
                      style="min-width: min(calc(100vw - 40px), 600px);min-height: 125px"
                      oninput="templateData.complementText = this.value.trim()"
            >${templateData.complementText || ''}</textarea>
            <span class="input__hint" style="min-height: unset">
                Please enter the details of your request.
                A member of our support staff will respond as soon as possible.
            </span>
        </div>
        <div class="captcha" id="captcha"></div>
        <button id="submit" class="form__button" style="height: 46px"
                onclick="if (!loading) completeTicket(this)">
            <span class="loader"><span></span><span></span><span></span></span>
            Submit
        </button>` : ''}
    </div>`
};

const getComplements = async () => {
    complements = +await (await fetch(`/support/complements?id=${id}`)).text();
    return complements;
};

const messageToHtml = msg => {
    const parser = new DOMParser();
    const temp = parser.parseFromString(
        `<div class="message">
        <div class="message__info">
            <span class="message__sender">${msg.adminSender ? "Support" : "You"},</span>
            <span class="message__time">${msg.sent}</span>
        </div>
        <p class="message__text"></p>
    </div>`, 'text/html');
    temp.querySelector(".message__text").textContent = msg.text;
    return temp.body.innerHTML;
};

const getMessagesHtml = () => messages
    .map(msg => messageToHtml(msg)).join("");

const onError = () => {
    idInput.style.animation = 'none';
    idInput.offsetHeight;
    idInput.style.animation = null;
    idInput.classList.add("input--error");
    idInput.classList.add("error");
    access.classList.remove("btn--loading");
};

const idBtnClicked = async btn => {
    btn.classList.add("btn--loading");
    const idInput = btn.parentNode.querySelector("#idInput");

    if (idInput.value.trim().length === 0) {
        onError();
        return;
    }

    messages = [];
    let _messages = await getMessages(idInput.value.trim());
    if (!_messages) {
        onError();
        return;
    }
    messages = _messages;
    setTimeout(() => {
        btn.classList.remove("btn--loading");
        btn.classList.remove("btn--loading");
        setPage(2, 1);
    }, 1000);
}

const getMessages = async (ticketId) => {
    const response = await fetch(`/support/get?id=${ticketId.trim()}`);
    if (!response.ok) return null;

    const _messages = JSON.parse(await response.text());
    id = ticketId.trim();
    _messages.forEach(msg => {
        msg.sent = new Date(msg.sent);
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        };
        msg.sent = msg.sent.toLocaleString("en-UK", options);
    })

    _messages.sort((msg1, msg2) => {
        const date1 = new Date(msg1.sent).getTime();
        const date2 = new Date(msg2.sent).getTime();
        return date2 - date1;
    });
    return _messages;
};

const refreshMessages = async () => {
    let _messages = await getMessages(id);
    if (!_messages) onError();

    if (messages.length < _messages.length) {
        const container = document.querySelector(".messages");
        const difference = [];
        for (let i = _messages.length - messages.length - 1; i >= 0; i--) {
            const parser = new DOMParser();
            const temp = parser.parseFromString(messageToHtml(_messages[i]), "text/html");
            container.prepend(temp.body.children[0]);
            difference.push(_messages[i]);
        }
        messages.splice(0, 0, difference);
    }

    _complements = Object.assign(complements, {});
    await getComplements();
    if (complements > 0 && _complements <= 0
        || complements <= 0 && _complements > 0) {
        getComplementForm().then(form => {
            const parser = new DOMParser();
            const temp = parser.parseFromString(form, 'text/html');
            document.querySelector("#form").replaceWith(temp.body.children[0]);
        });
    } else {
        document.querySelector("#complements").textContent = complements >= 0
            ? `Complements: ${complements}/5` : 'This ticket is closed.';
    }
};

const changeTemplate = node => {
    const children = dynamicContainer.children;
    const queue = [];
    for (let i = 0; i < children.length; i++) {
        queue.push(
            children[i].animate(
                {
                    opacity: [1, 0]
                },
                {
                    easing: "ease-in-out",
                    duration: 150,
                    iterations: 1,
                    fill: "forwards"
                }
            )
        );
    }

    let finished = false;
    const onfinish = () => {
        if (!finished) {
            if (queue.filter(animation => !animation.finished).length === 0) {
                for (let i = 0; i < children.length; i++) {
                    children[i].remove();
                }
                node.classList.add("transparent");
                dynamicContainer.childNodes.forEach(child => child.remove());
                dynamicContainer.appendChild(node);

                const nodes = dynamicContainer.children;
                for (let i = 0; i < nodes.length; i++) {
                    nodes[i].animate(
                        {
                            opacity: [0, 1]
                        },
                        {
                            easing: "ease-in-out",
                            duration: 150,
                            iterations: 1,
                            fill: "forwards"
                        }
                    );
                }
            }
        }
        finished = true;
        waitingForInteract = false;
        captcha = null;
        loading = false;
        turnstile.remove();
        renderCaptcha();
    }

    queue.forEach(animation =>
        animation.onfinish = onfinish
    );

    if (queue.length === 0) onfinish();
};

const changePage = async page => {
    window.location.hash = page.name;
    changeTemplate(await page.template());
}

function render() {
    if (!dynamicContainer) return;

    if (pages[step] instanceof Array)
        changePage(pages[step][option]);
    else changePage(pages[step]);
}

function checkHash() {
    const hash = window.location.hash.substring(1);
    let found = false;
    pages.forEach((page, i) => {
        if (page instanceof Array)
            page.forEach((option, j) => {
                if (option.name === hash) {
                    found = true;
                    setPage(i, j);
                }
            });
        else if (page.name === hash) {
            found = true;
            setPage(i, 0);
        }
    });
    if (!found) {
        render();
    }
}

let onCaptcha = [];

function renderCaptcha() {
    try {
        const container = document.querySelector("#captcha");
        container.innerHTML = "";
        turnstile.render(container, {
            theme: "light",
            sitekey: siteKey,
            callback: token => {
                captcha = token;
                onCaptcha.forEach((c, i) => {
                    try {
                        c(i)
                    } catch {
                    }
                });
            },
            "error-callback": () => {
                captcha = null;
                waitingForInteract = false;
                turnstile.implicitRender();
            },
            "before-interactive-callback": () => {
                waitingForInteract = true;
                loading = false;
                const btn = document.querySelector(".btn--loading");
                if (btn) btn.classList.remove("btn--loading");
            },
            "after-interactive-callback": () => {
                onCaptcha = [];
                waitingForInteract = false;
            },
            appearance: "interaction-only"
        });
    } catch {
    }
}

let attempts = 0;

const checkErrors = () => {
    const input = document.querySelector("textarea#text").value
        .trim().replaceAll(/\s+/g, "\s");
    const hint = document.querySelector(".input>.input__hint");
    let hasError = true;

    if (input.length === 0) {
        hint.innerHTML = `
                <span class="error">Please enter the details of your request.</span>
                ${attempts-- < 1 ? "A member of our support staff will respond as soon as possible." : ""}
            `;
    } else if (input.length < 30) {
        hint.innerHTML = `
                <span class="error">Please enter no less than 30 symbols.</span>
            `;
    } else if (input.length > 1000) {
        hint.innerHTML = `
                <span class="error">Please enter no more than 1000 symbols.</span>
            `;
    } else hasError = false;
    attempts++;

    const emailInput = document.querySelector("input#email");
    let email = emailInput.value;
    if (email && (email = email.trim()).length !== 0) {
        if (!new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(email)) {
            hasError = true;
            emailInput.classList.add("error");
            emailInput.classList.add("input--error");
        } else {
            emailInput.classList.remove("error");
            emailInput.classList.remove("input--error");
        }
    } else {
        emailInput.classList.remove("error");
        emailInput.classList.remove("input--error");
    }

    return !hasError;
};

function openTicket(btn) {

    if (!checkErrors()) {
        loading = false;
        btn.classList.remove("btn--loading");
        return;
    }

    if (!captcha && waitingForInteract) return;
    btn.classList.add("btn--loading");
    loading = true;

    const open = (i) => {
        const csrf = document.querySelector("#csrf");
        const body = {
            captcha: captcha,
            text: templateData.text,
            email: document.querySelector("input#email").value || ""
        };
        const headers = {
            "Content-Type": "application/json"
        };
        headers[csrf.name] = csrf.value;
        fetch("/support/open-ticket", {
            method: "POST",
            body: JSON.stringify(body),
            headers: headers,
        }).then(response => {
            response.text().then(id => {
                templateData.id = id;
                setPage(2, 0);
            });
        }).catch(() => {
            btn.classList.remove("btn--loading");
            renderCaptcha();
        });

        captcha = null;
        if (i) onCaptcha[i] = null;
    };

    if (!captcha)
        onCaptcha.push(open);
    else open();
}

function completeTicket(btn) {

    const hint = document.querySelector(".input>.input__hint");
    if (!captcha && waitingForInteract) {
        hint.innerHTML = "<span class='error'>Are you robot? Please solve the captcha.</span>";
        return;
    }

    if (!checkErrors()) {
        loading = false;
        btn.classList.remove("btn--loading");
        return;
    }
    btn.classList.add("btn--loading");

    loading = true;
    hint.textContent = "Please enter the details of your request. A member of our support staff will respond as soon as possible.";

    const complete = (i) => {
        if (complements <= 0) return;
        const csrf = document.querySelector("#csrf");
        const body = {
            captcha: captcha,
            text: templateData.complementText,
            id: id
        };
        const headers = {
            "Content-Type": "application/json"
        };
        headers[csrf.name] = csrf.value;
        fetch("/support/complete", {
            method: "POST",
            body: JSON.stringify(body),
            headers: headers,
        }).then(response => {
            refreshMessages().then(() => {
                setTimeout(() => {
                    scroll({
                        top: 0
                    });
                }, 500);
            });
            response.text().then(() => {
                onCaptcha = [];
                captcha = null;
            });
            renderCaptcha();
            btn.classList.remove("btn--loading");
            loading = false;
            document.querySelector("textarea#text").value = "";
            templateData.complementText = "";
        }).catch(() => {
            btn.classList.remove("btn--loading");
            loading = false;
            onCaptcha = [];
            captcha = null;
            renderCaptcha();
        });
    };

    if (!captcha) {
        onCaptcha.push(complete);
        setTimeout(() => {
            renderCaptcha();
        }, 6000);
    } else complete();
}
fetch("/csrf");

const bcrypt = dcodeIO.bcrypt;

String.prototype.toNode = function () {
    return new DOMParser().parseFromString(this, "text/html").body.children[0];
}

Node.prototype.toString = function () {
    const doc = new DOMParser().parseFromString("", "text/html");
    doc.body.appendChild(this);
    return doc.body.innerHTML;
}

let step;
let passphrase;

let confirmUnselected;
let confirmSelected;
const pages = [
    {
        node: () => `           
            <div class="disclaimer">
                <div class="text">
                    <h2>We are about to generate your very own passphrase</h2>
                    <p>This allows you to open your wallet on multiple devices and keep it secure.</p>
                    <p>It is <span class="bold">very important</span> to write down the passphrase.</p>
                </div>
                <button class="button-next" onclick="setStep(1)">
                    Generate passphrase
                    <svg class="arrow-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" stroke-miterlimit="10"><circle class="arrow-icon--circle" cx="16" cy="16" r="15.12"></circle><path class="arrow-icon--arrow" d="M16.14 9.93L22.21 16l-6.07 6.07M8.23 16h13.98"></path></g></svg>
                </button>
            </div>`.toNode(),
        stepAvailable: () => step !== 0
    },
    {
        node: () => {
            const checkboxesSelected = () => {
                let allSelected = true;
                node.querySelectorAll("input[type='checkbox']").forEach(input => {
                    if (!input.checked) allSelected = false;
                });
                return allSelected;
            };

            const selectText = element => {
                window.getSelection().selectAllChildren(element);
            };

            const node = `
            <div class="generate">
                <h2>Your passphrase:</h2>
                <div class="passphrase">
                    <span onclick="window.getSelection().selectAllChildren(this)"></span>
                    <button>Copy</button>   
                </div>

                <div class="checkboxes">
                    <div class="warning">
                        <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"/><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/><g id="SVGRepo_iconCarrier"> <path opacity="0.1" d="M10.2501 5.147L3.64909 17.0287C2.9085 18.3618 3.87244 20 5.39741 20H18.5994C20.1243 20 21.0883 18.3618 20.3477 17.0287L13.7467 5.147C12.9847 3.77538 11.0121 3.77538 10.2501 5.147Z" fill="#E84545FF"/> <path d="M12 10V13" stroke="#E84545FF" stroke-width="2" stroke-linecap="round"/> <path d="M12 16V15.9888" stroke="#E84545FF" stroke-width="2" stroke-linecap="round"/> <path d="M10.2515 5.147L3.65056 17.0287C2.90997 18.3618 3.8739 20 5.39887 20H18.6008C20.1258 20 21.0897 18.3618 20.3491 17.0287L13.7482 5.147C12.9861 3.77538 11.0135 3.77538 10.2515 5.147Z" stroke="#E84545FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/> </g></svg>
                        Your passphrase will not be shown again.
                        You will lose access to your wallet without the passphrase.
                    </div>
                    <div class="checkbox-group">
                        <div class="checkbox-wrapper">
                            <span class="checkbox">
                                <input id="saved" type="checkbox" onkeydown="event.preventDefault()"/>
                                <svg><use xlink:href="#animation" class="checkbox"></use></svg>
                            </span>
                        </div>                
                        <label for="saved">I have written down or otherwise securely stored my passphrase</label>
                    </div>
                    <div class="checkbox-group">
                        <div class="checkbox-wrapper">
                            <span class="checkbox">
                                <input id="agreed" type="checkbox" onkeydown="event.preventDefault()"/>
                                <svg><use xlink:href="#animation" class="checkbox"></use></svg>
                            </span>
                        </div>
                        <label for="agreed">I agree to the <a href="/about/conditions" target="_blank">Terms of Service</a></label>
                    </div>
                    <svg style="display:none"><symbol id="animation" viewBox="0 0 22 22"><path fill="none" stroke="currentColor" d="M5.5,11.3L9,14.8L20.2,3.3l0,0c-0.5-1-1.5-1.8-2.7-1.8h-13c-1.7,0-3,1.3-3,3v13c0,1.7,1.3,3,3,3h13 c1.7,0,3-1.3,3-3v-13c0-0.4-0.1-0.8-0.3-1.2"/></symbol></svg>
                </div>
                <button id="confirm" class="button-next button-next--disabled">
                    Confirm
                    ${window.innerWidth > 500 ?
                '<svg class="arrow-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" stroke-miterlimit="10"><circle class="arrow-icon--circle" cx="16" cy="16" r="15.12"></circle><path class="arrow-icon--arrow" d="M16.14 9.93L22.21 16l-6.07 6.07M8.23 16h13.98"></path></g></svg>'
                : ""}
                </button>
            </div>`.toNode();
            if (!passphrase) generatePassphrase();
            const passphraseElem = node.querySelector(".passphrase>span");
            const writePassphrase = p => {
                p = JSON.parse(p);
                passphraseElem.innerText = p.join(" ");
            };
            if (passphrase instanceof Promise)
                passphrase.then(r => {
                    if (!r.bodyUsed)
                        r.text().then(txt => {
                            passphrase = JSON.parse(txt.toString());
                            writePassphrase(txt);
                        })
                });
            else writePassphrase(passphrase);

            const copyButton = passphraseElem.parentElement.querySelector("button");
            const sayCopied = () => {
                copyButton.innerText = "Copied!";
                setTimeout(() => copyButton.innerText = "Copy", 1500);
            };
            copyButton.addEventListener("click", () => {
                navigator.clipboard.writeText(passphrase.join(" ")).then(sayCopied);
            });

            passphraseElem.addEventListener("click", e => {
                e.preventDefault();
                selectText(e.target);
            });
            passphraseElem.addEventListener("copy", e => {
                const selection = document.getSelection();
                if (selection.toString() === passphrase.join(" ")) sayCopied();
            });

            const button = node.querySelector("button#confirm");
            node.querySelectorAll("input[type='checkbox']").forEach(input => {
                input.addEventListener("change", async () => {
                    if (checkboxesSelected()) {
                        if (button.classList.contains("button-next--disabled"))
                            button.classList.remove("button-next--disabled");
                    } else if (!button.classList.contains("button-next--disabled"))
                        button.classList.add("button-next--disabled");
                    await renewStepCursors();
                });
            });

            button.addEventListener("click", () => {
                if (checkboxesSelected()) setStep(2);
            });

            return node;
        },
        stepAvailable: () => {
            return step <= 2 && step !== 1
        }
    },
    {
        node: async () => {
            const node = `
            <div class="confirm">
                <h2>Almost done! Enter the following words from your passphrase.</h2>
                <div class="inputs">
                    <span id="error" class="error-notify hidden">
                        It looks like your session was suddenly closed. Please
                         <a href="${window.location.href}" 
                            onclick="window.location.reload()">reload</a>
                        the page and try again. 
                    </span>
                    <div class="input-group">
                        <label for="word1"></label>
                        <input id="word1" type="text">
                    </div>
                    <div class="input-group">
                        <label for="word2">Word #1</label>
                        <input id="word2" type="text">
                    </div>
                </div>
                <button id="confirm" class="button-next button-next--disabled">
                    <span class="loader"><span></span><span></span><span></span></span>
                    Confirm
                </button>
            </div>`.toNode();
            let loading = false;
            const firstWord = node.querySelector("#word1");
            const firstWordLabel = firstWord.previousElementSibling;
            const secondWord = node.querySelector("#word2");
            const rand = (min, max) => {
                const bytes = new Uint8Array(1);
                window.crypto.getRandomValues(bytes);
                const range = max - min + 1;
                const max_range = 256;
                if (bytes[0] >= Math.floor(max_range / range) * range)
                    return rand(min, max);
                return min + (bytes[0] % range);
            };
            let firstWordIndex = rand(1, 11);
            firstWordLabel.innerText = `Word #${firstWordIndex + 1}`;
            confirmUnselected = () => {
                if (secondWord.value.trim().toLowerCase() === passphrase[0]
                    && firstWord.value.trim().toLowerCase() === passphrase[firstWordIndex]) return;
                const index = rand(1, 11);
                if (index === firstWordIndex) return confirmUnselected();
                firstWordIndex = index;
            };
            confirmSelected = () => {
                if (secondWord.value.trim().toLowerCase() === passphrase[0]
                    && firstWord.value.trim().toLowerCase() === passphrase[firstWordIndex]) return;
                firstWordLabel.innerText = `Word #${firstWordIndex + 1}`;
                firstWord.value = "";
                firstWord.classList.remove("error");
                button.classList.add("button-next--disabled");
            };
            const button = node.querySelector("button#confirm");
            const onInput = () => {
                if (firstWord.value.toLowerCase() && firstWord.value.trim().toLowerCase() !== ""
                    && secondWord.value.toLowerCase() && secondWord.value.trim().toLowerCase() !== "")
                    button.classList.remove("button-next--disabled");
                else button.classList.add("button-next--disabled");
            };
            firstWord.addEventListener("input", onInput);
            secondWord.addEventListener("input", onInput);
            button.addEventListener("click", () => {
                if (loading) return;
                if (!firstWord.value || firstWord.value.trim().toLowerCase() === ""
                    || !secondWord.value || secondWord.value.trim().toLowerCase() === "") return;
                if (firstWord.value.trim().toLowerCase() !== passphrase[firstWordIndex])
                    firstWord.classList.add("error");
                else firstWord.classList.remove("error");
                if (secondWord.value.trim().toLowerCase() !== passphrase[0])
                    secondWord.classList.add("error");
                else secondWord.classList.remove("error");
                if (secondWord.value.trim().toLowerCase() === passphrase[0]
                    && firstWord.value.trim().toLowerCase() === passphrase[firstWordIndex]) {
                    loading = true;
                    button.classList.add("btn--loading");
                    const start = Date.now();
                    bcrypt.genSalt(12, (_, salt) => {
                        bcrypt.hash(firstWord.value.trim().toLowerCase() + secondWord.value.trim().toLowerCase(), salt, (_, hash) => {
                            const csrf = document.querySelector("#csrf");
                            const headers = {
                                "Content-Type": "application/json"
                            };
                            headers[csrf.name] = csrf.value;
                            fetch("/seed/verify", {
                                method: "POST",
                                body: JSON.stringify({
                                    words: [firstWordIndex, 0],
                                    hash: hash
                                }),
                                headers: headers
                            }).then(r => {
                                if (r.status >= 400) {
                                    loading = false;
                                    button.classList.remove("btn--loading");
                                    document.querySelector("#error").classList.remove("hidden");
                                } else setTimeout(() => window.location.href = "/app/lock", 1000);
                            });
                        });
                    });
                }
            });
            return node;
        },
        stepAvailable: () => {
            if (step === 2) return false;
            let allSelected = true;
            const generate = document.querySelector(".generate");
            if (!generate) return false;
            generate
                .querySelectorAll("input[type='checkbox']")
                .forEach(
                    input => {
                        if (!input.checked) allSelected = false;
                    });
            return allSelected;
        },
        unselected: () => confirmUnselected(),
        selected: () => confirmSelected()
    }
];

pages.forEach(async (page, i) => {
    const frameSlider = document.querySelector("#frameSlider");
    const frame = Object.assign(
        document.createElement("div"), {
            className: "frame"
        }
    );
    const node = await pages[i].node();
    frame.appendChild(node);
    frameSlider.appendChild(frame);
});

async function renewStepCursors() {
    const stepper = document.querySelector("#stepper");
    stepper.querySelectorAll(".stepper__step").forEach((elem, i) =>
        elem.style.cursor = pages[i].stepAvailable() ? "pointer" : "default"
    );
}

async function setStep(s) {
    if (step === s) return;
    const stepper = document.querySelector("#stepper");
    stepper.querySelector(".stepper__progress").querySelector(".after")
        .style.width = `${Math.max(0, Math.min(100, 50 * s))}%`;
    const _step = step;
    step = s;
    renewStepCursors();
    stepper.querySelectorAll(".stepper__step").forEach((elem, i) => {
        if (i <= s) elem.classList.remove("stepper__step--disabled")
        else elem.classList.add("stepper__step--disabled");
        try {
            if (i === s) pages[i].selected();
            else if (i === _step) pages[i].unselected();
        } catch {
        }
        elem.onclick = () => {
            if (pages[i].stepAvailable()) setStep(i);
        }
    });
    const slider = document.querySelector("#frameSlider");
    slider.querySelectorAll(".frame").forEach((frame, i) => {
        frame.animate(
            {opacity: i === step ? [0, 1] : i === _step ? [1, 0] : [0, 0]},
            {
                duration: 150,
                fill: "forwards"
            }
        )
    });
    slider.style = `--frame: ${step}`;
}


async function generatePassphrase() {
    passphrase = fetch("/seed/new");
}

setStep(0);

function back() {
    if (step > 0 && pages[step - 1].stepAvailable()) setStep(step - 1);
    else history.back();
}
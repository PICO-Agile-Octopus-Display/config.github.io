
async function displayStage(stage, settingsObject) {

    // clear away the old stage help
    let stageElement = document.getElementById("stageDescription");

    while (stageElement.children.length > 0) {
        stageElement.removeChild(stageElement.children[0]);
    }

    // draw the new stage
    let orderedList = null;

    stage.description.forEach(message => {
        let element;

        if (message == "=") {
            console.log("doing the horizontal rule thing");
            element = document.createElement("hr");
            stageElement.appendChild(element);
            return;
        }

        if (message.startsWith("IMAGE:")) {
            console.log("doing the image thing");
            message = message.slice(6);
            image = document.createElement("img");
            image.style.margin = `20px`;
            image.style.border = "2px solid black";
            image.src = message;
            stageElement.appendChild(image);
            return;
        }

        if (message.startsWith("QR:")) {
            message = message.slice(3);
            qrCode = document.createElement("p");
            new QRCode(qrCode,
                {
                    text: message,
                    width: 128,
                    height: 128,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            stageElement.appendChild(qrCode);
            return;
        }

        if (message.startsWith("#")) {
            message = message.slice(1);
            element = document.createElement("p");
            element.style.fontFamily = "'Courier New', monospace";
            element.style.fontSize = "20";
            element.style.whiteSpace = "pre";
            element.textContent = message;
            stageElement.appendChild(element);
            return;
        }

        if (message.startsWith("*")) {
            message = message.slice(1);
            element = document.createElement("h3");
            element.textContent = message;
            stageElement.appendChild(element);
        }
        else {
            if (message.startsWith("1.")) {
                message = message.slice(2);
                if (!orderedList) {
                    orderedList = document.createElement("ol");
                    stageElement.appendChild(orderedList);
                }
                element = document.createElement("li");
                element.textContent = message;
                orderedList.appendChild(element)
            }
            else {
                orderedList = null;
                element = document.createElement("p");
                element.textContent = message;
                stageElement.appendChild(element);
            }
        }
    });

    if (settingsObject) {
        settingsObject.forEach((setting) => {
            let id = setting[0];
            let value = setting[1];

            let divElement = document.createElement("div");
            divElement.className = "form-group mt-4";
            let labelElement = document.createElement("label");
            labelElement.setAttribute('for', id);
            labelElement.textContent = value.name;
            divElement.appendChild(labelElement);

            let inputElement;

            if (value.values) {
                // setting has a list of possible values which the user can choose from
                // must create a Select input
                inputElement = document.createElement("select");
                value.values.forEach( item=>{ 
                    let optionElement = document.createElement("option");
                    optionElement.value = item;
                    optionElement.innerHTML=item;
                    if (item==value.value){
                        // this is the selected item
                        optionElement.selected=true;
                    }
                    inputElement.appendChild(optionElement);
                });
            }
            else {
                inputElement = document.createElement("input");
                inputElement.setAttribute("type", value.type);
            }
            inputElement.setAttribute("id", id);
            inputElement.setAttribute("title", value.desc);
            divElement.appendChild(inputElement);
            inputElement.className = "form-control";
            inputElement.value = value.value;
            stageElement.appendChild(divElement);
        });
    }


    for (let i = 0; i < stage.buttons.length; i++) {
        let button = stage.buttons[i];
        let buttonElement = document.createElement("button");

        buttonElement.className = "btn btn-primary mt-2 w-100";
        buttonElement.textContent = button.buttonText;
        buttonElement.setAttribute("id", button.buttonText);
        buttonElement.setAttribute("type", "button");
        buttonElement.addEventListener("click", button.buttonDest);

        let parElement = document.createElement("p");
        parElement.appendChild(buttonElement);
        stageElement.appendChild(parElement);
    }
}

async function selectStage(newStage, settingsObject) {
    stage = newStage;
    await displayStage(stage, settingsObject);
}

let textHandlerFunction = null;

function handleIncomingText(text) {
    console.log(`Received:${text}`)
    if (textHandlerFunction != null) {
        textHandlerFunction(text);
    }
}

async function connectConIO() {
    if (consoleIO == null) {

        consoleIO = new ConsoleIO();

        let result;

        result = await consoleIO.connectToSerialPort();

        if (result != "") {
            alert(`Could not continue: ${result}`);
            selectStage(stages.ConnectFailed);
            return false;
        }
        else {
            console.log("Console opened");
            consoleIO.startSerialPump(handleIncomingText);
            return true;
        }
    }
}

async function connectConIOandSelectStage(stage) {

    let connectResult = await connectConIO();

    if (!connectResult) {
        return false;
    }
    await selectStage(stage);
    return true;
}


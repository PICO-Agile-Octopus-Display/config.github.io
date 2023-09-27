var stage;
var consoleIO;
let entries;

const stages = {
    ConnectUSB: {
        description: ["*Plug your display into a usb socket",
            `You can use this page to configure all the settings in your display. You will only have to do when you want to update the settings. They are stored inside the device.`,
            `Note that anyone obtaining your display would be able to obtain your WiFi details from it. For this reason it is suggested that you connect it to your "Guest" WiFi account. For more details on security take a look at the GitHub page.`,
            `You'll need a usb cable to connect your display to your computer. When you plug it the computer should recognise it automatically and install the drivers. If it doesn't you may have to install them by hand. `,
            `In Windows you can check in Device Manager to make sure that the device is working OK. Click the Windows Start button and search for 'Device' and then select the Device Manager from the menu. If all is well you should see your device appear.`,
            `Next you need to connect your display to the browser. Press "Display plugged in" when your display is plugged in and dialogue box will appear inviting you to select the usb port it is connected to.`,
            `Once the device has been selected the configuration will begin. It may take a few seconds before the configuration page appears.`
        ],
        inputFields: [],
        buttons: [
            { buttonText: "Display plugged in", buttonDest: doAttemptConnection }
        ]
    },
    config: {
        description: ["*Configure Display",
            `Fill in the settings for your display.`,
            `Press Submit when you have finished`
        ],
        inputFields: [],
        buttons: [
            { buttonText: "Submit", buttonDest: doSaveEntries }
        ]
    },
    ConnectFailed: {
        description: ["*Connect failed",
            `The connection to your display seems to have failed`,
            `Make sure that it is connected correctly.`,
            `If it still won't connect, try another usb port.`,
            `Press "Retry" to try again.`],
        inputFields: [],
        buttons: [
            { buttonText: "Retry", buttonDest: () => { window.location.replace("./"); } }
        ]
    },
    ConfigSuccess: {
        description: ["*Configuration complete",
            'The settings have been stored in your display.',
            'It is now restarting so that the new settings will come into effect.'],
        inputFields: [],
        buttons: [
            { buttonText: "Configure another display ", buttonDest: () => { window.location.replace("./"); } }
        ]
    }
}

async function doStart() {
    console.log("starting");
    await selectStage(stages.ConnectUSB);
}

async function doConnectToDevice() {
    await selectStage(stages.ConnectToDevice);
}

async function doAttemptConnection() {

    let result = await connectConIO();

    if (!result) {
        await selectStage(stages.ConnectFailed);
        return;
    }

    console.log("Asking for data");

    let jsonString = await consoleIO.performCommand("send");

    let settingsObject = null;

    try {
        settingsObject = JSON.parse(jsonString);
        console.log("Json parsed OK");
    }
    catch {
        console.log(`Json parse failed:${jsonString}`);
        await selectStage(stages.ConnectFailed);
        return;
    }

    entries = Object.entries(settingsObject);

    entries.sort((a, b) => a[1].order - b[1].order);

    await selectStage(stages.config, entries);
}

async function doSaveEntries() {

    entries.forEach((setting) => {
        let id = setting[0];
        let value = setting[1];
        let inputElement = document.getElementById(id);
        value.value = inputElement.value;
    });

    // Now create a dictionary to send back to the device

    let result = {};

    entries.forEach((setting) => {
        result[setting[0]] = setting[1];
    });

    let resultJSON = JSON.stringify(result);

    console.log(`Sending:${resultJSON}`);

    let response = await consoleIO.performCommand("json " + resultJSON);

    if (response == "done")
        await selectStage(stages.ConfigSuccess);
    else {
        await selectStage(stages.ConnectFailed);
    }
}


const ConsoleStates = {
  starting: "Starting",
  waitingForCommandResponse: "waitingForReply"
}

class ConsoleIO {

  async delay(timeInMs) {
    return new Promise(async (kept, broken) => {
        setTimeout(async () => {
            return kept("tick");
        }, timeInMs);
    });
}

  constructor() {
    this.port = null;
    this.reader = null;
    this.handleIncomingText = null;
    this.lineBuffer = "";
    this.command = "";
    this.reply = null;
    this.setState(ConsoleStates.starting);
  }

  async connectToSerialPort() {

    if (!"serial" in navigator) {
      this.port = null;
      return "This browser doesn't support serial connection. Try Edge or Chrome.";
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200, bufferSize: 10000 });
    }
    catch (error) {
      return "Serial port open failed:" + error.message;
    }

    return "";
  }

  async disconnectFromSerialPort() {
    await this.port.close();
    this.reader = null;
  }

  setState(newState) {
    console.log(`    State:${newState}`);
    this.state = newState;
  }

  handleCommand(text) {

    text = text.trim();

    console.log("Got a reply:" + text);

    switch (this.state) {

      case ConsoleStates.starting:
        break;

      case ConsoleStates.waitingForCommandResponse:
        if (text.startsWith("*")) {
          text = text.slice(1);
          this.kept(text);
          this.setState(ConsoleStates.starting);
        }
        break;

    }
  }

  performCommand(command) {
    console.log("Performing:" + command);
     const commandPromise = new Promise((kept, broken) => {
      if (this.state != ConsoleStates.starting) {
        broken(`Command ${this.command} already active when command ${command} received`);
      }
      else {
        this.kept = kept;
        this.broken = broken;
        this.command = command;
        this.setState(ConsoleStates.waitingForCommandResponse);
        this.sendText( `*${command}\r`);
      }
    });

    const timeout = 20000;

    setTimeout(() => {
      this.kept(`TIMEOUT`);
    }, timeout);

    return commandPromise;
  }


  async performCommands(commands) {
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      await this.performCommand(command);
    }
  }

  async writeUint8Array(valArray) {
    const writer = this.port.writable.getWriter();
    await writer.write(valArray);
    writer.releaseLock();
  }

  async sendText(text) {
    let bytes = new TextEncoder("utf-8").encode(text);
    await this.writeUint8Array(bytes);
  }

  handleIncomingBytes(bytes) {
    var text = new TextDecoder("utf-8").decode(bytes);
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch == '\n') {
        if (this.lineBuffer.length > 0) {
          this.handleCommand(this.lineBuffer);
          this.lineBuffer = "";
        }
      }
      else {
        if (ch != '\r') {
          this.lineBuffer = this.lineBuffer + text[i];
        }
      }
    }
  }

  async pumpReceivedCharacters() {
    while (this.port.readable && this.keepReading) {
      this.reader = this.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) {
            break;
          }
          // value is a Uint8Array.
          this.handleIncomingBytes(value);
        }
      } catch (error) {
        console.log(`Serial error:${error.message}`);
      } finally {
        // Allow the serial port to be closed later.
        this.reader.releaseLock();
      }
    }
    await this.port.close();
  }

  async disconnect() {
    if (this.port == null || this.keepReading == false) {
      return;
    }
    this.keepReading = false;

    if (this.reader != null) {
      this.reader.cancel();
    }
  }

  async startSerialPump(destination) {
    this.keepReading = true;
    this.handleIncomingText = destination;
    await this.pumpReceivedCharacters();
    return "Serial disconnected";
  }
}


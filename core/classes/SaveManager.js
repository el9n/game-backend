const fs = require("fs");
const Action = require("./entities/Action");
const EventEmitter = require("events");

module.exports = class SaveManager extends EventEmitter {
  #data;
  #path;

  constructor(path) {
    super();
    this.#path = path;
    this.#data = JSON.parse(fs.readFileSync(this.#path));
  }

  #syncFile() {
    fs.writeFileSync(this.#path, JSON.stringify(this.#data));
    this.emit("change", this.#data);
  }

  get options() {
    return this.#data.options;
  }
  get players() {
    return this.#data.options.players;
  }
  get questions() {
    return this.#data.questions;
  }
  get history() {
    return this.#data.history;
  }

  action(type, user, options) {
    console.log(type, user, options);

    switch (type) {
      case "answer": {
        this.#data.history.push(new Action(type, user, options));
        break;
      }
      case "capture": {
        this.#data.history.push(new Action(type, user, options));
        break;
      }
      default:
        return;
    }

    this.#syncFile();
  }
};

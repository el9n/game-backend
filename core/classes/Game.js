module.exports = class Game {
  #_state = false;

  constructor(cm, game) {
    this.cm = cm;
    this.game = game;

    this.cm.onRoomEvent(this.cm.mainRoom, "join", (room, id) => {
      const user = this.cm.getUserById(id);

      // отправить пользователю вопросы
      this.#stateSensetiveFactory(() =>
        user.emit("questions", this.game.questions)
      );
      // отправить пользователю историю
      this.#stateSensetiveFactory(() =>
        user.emit("history", this.game.history)
      );

      // пользователь ответил на вопрос
      user.on("answer", ({ questionIndex, answer }) => {
        this.#stateSensetiveFactory(() => {
          const successful = this.compareAnswer(
            this.game.questions[questionIndex].answer,
            answer
          );

          this.game.action("answer", user.letter, {
            answer,
            questionIndex,
            successful,
          });
        });
      });

      // пользователь захватил клетку
      user.on("capture", ({ cell }) => {
        this.#stateSensetiveFactory(() => {
          this.game.action("capture", user.letter, { cell });
        });
      });
    });

    this.cm.onRoomEvent(this.cm.mainRoom, "leave", (room, id) => {
      const user = this.cm.getUserById(id);

      user.removeAllListeners();
    });

    this.game.on("change", (game) => {
      this.cm.mainRoom.emit("history", this.game.history);
    });
  }

  set #state(value) {
    this.#_state = value;

    // обновить данные при запуске игры
    if (value) {
      this.cm.mainRoom.emit("questions", this.game.questions);
    }

    return true;
  }
  get #state() {
    return this.#_state;
  }

  #stateSensetiveFactory(fn) {
    if (this.#state) {
      fn();
    }
  }

  compareAnswer(correctAnswer, userAnswer) {
    const modify = (string) => string.toLowerCase().replace(/\s+/g, " ").trim();

    if (modify(correctAnswer) === modify(userAnswer)) {
      return true;
    }
    return false;
  }

  start() {
    this.#state = true;
  }
};

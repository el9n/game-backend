module.exports = class Player {
  letter;
  color;
  name;
  score;

  constructor(letter, name, color, score = 0) {
    this.letter = letter;
    this.name = name;
    this.color = color;
    this.score = score;
  }
};

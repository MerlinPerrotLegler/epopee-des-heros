import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene.js";
import { JoinScene } from "./game/scenes/JoinScene.js";
import { HandScene } from "./game/scenes/HandScene.js";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 844,
  },
  backgroundColor: "#1a1a2e",
  scene: [BootScene, JoinScene, HandScene],
};

new Phaser.Game(config);

import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene.js";
import { LobbyScene } from "./game/scenes/LobbyScene.js";
import { BoardScene } from "./game/scenes/BoardScene.js";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 800,
  },
  backgroundColor: "#1a1a2e",
  scene: [BootScene, LobbyScene, BoardScene],
};

new Phaser.Game(config);

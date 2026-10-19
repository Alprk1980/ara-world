import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import { Application } from 'pixi.js';
import { SceneStack } from './app/scenes.ts';
import { Game } from './app/game.ts';

async function start() {
  await document.fonts.load('600 32px Fredoka').catch(() => undefined);
  const app = new Application();
  await app.init({ resizeTo: window, background: '#ffc4dc', antialias: true, resolution: Math.min(window.devicePixelRatio, 2), autoDensity: true });
  document.body.appendChild(app.canvas);
  const stack = new SceneStack(app);
  app.stage.addChild(stack.root);
  const game = new Game(app, stack);
  await game.start();
  window.addEventListener('resize', () => game.layout());
  // For headless runs and debugging.
  (window as unknown as { ara: Game }).ara = game;
}

start();

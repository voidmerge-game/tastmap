import React from 'react';
import {Composition} from 'remotion';
import {Demo} from './Demo';
import {Main, MAIN_DURATION_SEC} from './Main';
import {W, H, FPS} from './theme';

export const Root: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={Math.ceil(MAIN_DURATION_SEC * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Demo" component={Demo} durationInFrames={15 * FPS} fps={FPS} width={W} height={H} />
  </>
);

import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

let loaded: Promise<void> | null = null;
export const ensureFonts = () => {
  if (!loaded) {
    loaded = Promise.all([
      loadFont({family: 'Cinzel', url: staticFile('fonts/Cinzel.ttf'), weight: '400 900'}),
      loadFont({family: 'Barlow Condensed', url: staticFile('fonts/BarlowCondensed-Regular.ttf'), weight: '400'}),
      loadFont({family: 'Barlow Condensed', url: staticFile('fonts/BarlowCondensed-SemiBold.ttf'), weight: '600'}),
      loadFont({family: 'Barlow Condensed', url: staticFile('fonts/BarlowCondensed-Bold.ttf'), weight: '700'}),
      loadFont({family: 'Barlow', url: staticFile('fonts/Barlow-Regular.ttf'), weight: '400'}),
      loadFont({family: 'Montserrat', url: staticFile('fonts/Montserrat.ttf'), weight: '100 900'}),
      loadFont({family: 'Special Elite', url: staticFile('fonts/SpecialElite.ttf'), weight: '400'}),
    ]).then(() => undefined);
  }
  return loaded;
};

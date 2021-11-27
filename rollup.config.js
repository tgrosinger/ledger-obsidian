import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

const isProd = process.env.BUILD === 'production';

export default {
  input: 'src/main.ts',
  output: {
    dir: '.',
    sourcemap: 'inline',
    sourcemapExcludeSources: isProd,
    format: 'cjs',
    exports: 'default',
  },
  external: ['obsidian', 'fs', 'os', 'path'],
  plugins: [
    typescript(),
    resolve({
      browser: true,
    }),
    babel({
      presets: ['@babel/preset-react', '@babel/preset-typescript'],
      babelHelpers: 'bundled',
    }),
    commonjs(),
  ],
};

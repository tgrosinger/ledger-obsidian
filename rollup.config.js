import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import replace from "@rollup/plugin-replace";
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { env } from "process";

const isProd = env.BUILD === 'production';

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
    replace({
      "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV),
      preventAssignment: true,
    }),
    babel({
      presets: ['@babel/preset-react', '@babel/preset-typescript'],
      babelHelpers: 'bundled',
    }),
    commonjs(),
  ],
};

import typescript from '@rollup/plugin-typescript';

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/index.mjs',
            format: 'esm'
        },
        {
            file: 'dist/index.js',
            format: 'cjs'
        }
    ],
    plugins: [typescript()]
};
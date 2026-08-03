// @ts-check
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";
import jest from "eslint-plugin-jest";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import importX from "eslint-plugin-import-x";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";

export default tseslint.config(
    {
        ignores: ["dist", "coverage", "eslint.config.mjs"],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        plugins: {
            "no-relative-import-paths": noRelativeImportPaths,
            "simple-import-sort": simpleImportSort,
        },
        rules: {
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
            "no-relative-import-paths/no-relative-import-paths": [
                "warn",
                { allowSameFolder: true, rootDir: "src", prefix: "@" },
            ],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-unsafe-argument": "warn",
        },
    },
    {
        ...jest.configs["flat/recommended"],
        files: ["**/*.spec.ts", "**/*.e2e-spec.ts"],
        languageOptions: {
            globals: jest.environments.globals.globals,
        },
        rules: {
            ...jest.configs["flat/recommended"].rules,
            "@typescript-eslint/unbound-method": "off",
            "jest/unbound-method": "error",
            "jest/no-focused-tests": "error",
            "jest/no-disabled-tests": "warn",
            "jest/expect-expect": [
                "error",
                { assertFunctionNames: ["expect", "**.expect"] },
            ],
        },
    },
    {
        files: ["src/**/*.ts", "test/**/*.ts"],
        plugins: { "import-x": importX },
        settings: {
            "import-x/resolver-next": [createTypeScriptImportResolver()],
        },
        rules: {
            "import-x/no-cycle": ["error", { maxDepth: Infinity }],
        },
    },
);

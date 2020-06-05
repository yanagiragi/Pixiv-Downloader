module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true 
    },
    "extends": "eslint:recommended",
    "parser": "babel-eslint",
    "parserOptions": {
        "ecmaVersion": 8,
        "sourceType": "module"
    },
    "rules": {
        'no-console': 'off',
        "no-unused-vars": 'off',
        "indent": [
            "error",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "never"
        ]
    },
    "plugins": [
        "jsdoc"
    ]
};

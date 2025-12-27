module.exports = {
    transformIgnorePatterns: ['node_modules/(?!(sucrase)/)'],
    transform: {
        '^.+\\.(js|jsx|ts|tsx|mjs)$': 'babel-jest',
    },
    preset: 'ts-jest',
    testEnvironment: 'node',
    cacheDirectory: '.tmp/jestCache'
};
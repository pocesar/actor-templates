const { expect } = require('chai');
const fs = require('fs');
const sinon = require('sinon');
const path = require('path');
const { ENV_VARS } = require('apify-shared/consts');
const { spawnSync } = require('child_process');
const loadJson = require('load-json-file');
const rimraf = require('rimraf');
const { TEMPLATES_NAME } = require('../src/consts');
const copy = require('recursive-copy');


const TEST_ACTORS_FOLDER = 'test-actors';
const APIFY_LATEST_VERSION = spawnSync('npm', ['view', 'apify', 'version']).stdout.toString().trim();

const checkTemplateStructureAndRun = async (actorName) => {
    process.chdir(actorName);
    spawnSync('npm', ['install']);
    process.chdir('../');

    const apifyJsonPath = path.join(actorName, 'apify.json');
    // Check files structure
    expect(fs.existsSync(actorName)).to.be.true;
    expect(fs.existsSync(path.join(actorName, 'package.json'))).to.be.true;
    expect(fs.existsSync(apifyJsonPath)).to.be.true;

    // Check if template has the latest apify package version
    const apifyModulePackageJson = path.join(actorName, 'node_modules', 'apify', 'package.json');
    expect(loadJson.sync(apifyModulePackageJson).version).to.be.eql(APIFY_LATEST_VERSION);

    // Check if actor was created without errors
    expect(console.log.args.map(arg => arg[0])).to.not.include('Error:');

    process.chdir(actorName);
    spawnSync('apify', ['run']);
    process.chdir('../');

    // Check if actor run without errors
    expect(console.log.args.map(arg => arg[0])).to.not.include('Error:');
};

let prevEnvHeadless;

describe('templates', () => {
    before(async () => {
        prevEnvHeadless = process.env[ENV_VARS.HEADLESS];
        process.env[ENV_VARS.HEADLESS] = '1';

        if (!fs.existsSync(TEST_ACTORS_FOLDER)) fs.mkdirSync(TEST_ACTORS_FOLDER);
        process.chdir(TEST_ACTORS_FOLDER);
    });

    after(async () => {
        process.env[ENV_VARS.HEADLESS] = prevEnvHeadless;

        process.chdir('../');
        if (fs.existsSync(TEST_ACTORS_FOLDER)) rimraf.sync(TEST_ACTORS_FOLDER);
    });

    beforeEach(() => {
        sinon.spy(console, 'log');
    });

    afterEach(() => {
        console.log.restore();
    });

    TEMPLATES_NAME.forEach((templateName) => {
        it(`${templateName} works`, async () => {
            const actorName = `cli-test-${templateName.replace(/_/g, '-')}`;
            await copy(`../templates/${templateName}`, actorName, { dot: true });
            await checkTemplateStructureAndRun(actorName, templateName);
        });
    });
});

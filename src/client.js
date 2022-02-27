import { EventEmitter } from "events";
import path from "path";
import FS from "fs-extra";
import chokidar from "chokidar";
import cp from "child_process";
import LockfileParser from "./LockfileParser.js";

const lockfile = new LockfileParser();

const IS_WIN = process.platform === "win32";
const IS_MAC = process.platform === "darwin";

/**
 * The time duration in milliseconds between each attempt to locate a LeagueClient process.
 *
 * Default: 1000
 */
const defaultPollInterval = 5000;

class LeagueClient extends EventEmitter {

    /**
     * To determine if the client is running or the game process.
     */
    static PROCESS_TYPE;

    /**
     * Create new client instance.
     *
     * @param {object} [options] Client options.
     * @param {string} options.executablePath Optional path to where the LeagueClient executable resides.
     * @param {number} options.pollInterval The time duration in milliseconds between each attempt to locate the process.
     */
    constructor(options) {

        super();

        if (options?.executablePath) this._dirPath = path.dirname(path.normalize(options.executablePath));
        this.pollInterval = options?.pollInterval || defaultPollInterval;
    }

    /**
     * Start listening to the LCU client or the game process.
     */
    start() {

        if (LeagueClient.isValidLCUPath(this._dirPath)) {

            this._initLockfileWatcher();
            return;
        }

        this._initProcessWatcher();
    }

    /**
     * Stop listening.
     */
    stop() {

        this._clearProcessWatcher();
        this._clearLockfileWatcher();
    }

    static isValidLCUPath(dirPath) {

        if (!dirPath) return false;

        const lcuClientApp = IS_MAC ? "LeagueClient.app" : "LeagueClient.exe";
        const common = FS.existsSync(path.join(dirPath, lcuClientApp)) && FS.existsSync(path.join(dirPath, "Config"));
        const isGlobal = common && FS.existsSync(path.join(dirPath, "RADS"));
        const isCN = common && FS.existsSync(path.join(dirPath, "TQM"));

        return isGlobal || isCN || common;
    }

    static getLCUPathFromProcess() {

        LeagueClient.PROCESS_TYPE = "client";

        return new Promise(resolve => {

            const INSTALL_REGEX_WIN = /"--install-directory=(.*?)"/;
            const INSTALL_REGEX_MAC = /--install-directory=(.*?)( --|\n|$)/;
            const INSTALL_REGEX = IS_WIN ? INSTALL_REGEX_WIN : INSTALL_REGEX_MAC;
            const command = IS_WIN ?
                `WMIC PROCESS WHERE name='LeagueClientUx.exe' GET commandline` :
                `ps x -o args | grep 'LeagueClientUx'`;

            cp.exec(command, (err, stdout, stderr) => {

                if (err || !stdout || stderr) {

                    resolve();
                    return;
                }

                const parts = stdout.match(INSTALL_REGEX) || [];
                resolve(parts[1]);
            });
        });
    }

    static getGamePathFromProcess() {

        LeagueClient.PROCESS_TYPE = "game";

        return new Promise(resolve => {

            // Check if game exist
            const GAME_REGEX_DIR_WIN = /-GameBaseDir=(.*?)"/;
            const GAME_REGEX_DIR_MAC = /-GameBaseDir=(.*?)( -|\n|$)/;
            const GAME_REGEX = IS_WIN ? GAME_REGEX_DIR_WIN : GAME_REGEX_DIR_MAC;
            const gameCommand = IS_WIN ?
                `WMIC PROCESS WHERE name='League of Legends.exe' GET commandline` :
                `ps x -o args | grep 'League of Legends'`;

            cp.exec(gameCommand, (err, stdout, stderr) => {

                if (err || !stdout || stderr) {

                    resolve();
                    return;
                }

                const parts = stdout.match(GAME_REGEX) || [];
                resolve(parts[1]);
            });
        });
    }

    _initLockfileWatcher() {

        if (this._lockfileWatcher) return;

        const lockfilePath = path.join(this._dirPath, "lockfile");
        this._lockfileWatcher = chokidar.watch(lockfilePath, { disableGlobbing: true });

        this._lockfileWatcher.on("add", this._onFileCreated.bind(this));
        this._lockfileWatcher.on("change", this._onFileCreated.bind(this));
        this._lockfileWatcher.on("unlink", this._onFileRemoved.bind(this));
    }

    _clearLockfileWatcher() {
        if (this._lockfileWatcher) this._lockfileWatcher.close();
    }

    async _initProcessWatcher() {

        let lcuPath = await LeagueClient.getLCUPathFromProcess();

        if (!lcuPath) {
            lcuPath = await LeagueClient.getGamePathFromProcess();
        }

        if (lcuPath) {

            this._dirPath = lcuPath;
            this._clearProcessWatcher();
            this._initLockfileWatcher();
            return;
        }

        if (!this._processWatcher) {
            this._processWatcher = setInterval(this._initProcessWatcher.bind(this), this.pollInterval);
        }
    }

    _clearProcessWatcher() {
        clearInterval(this._processWatcher);
    }

    _onFileCreated(path) {

        lockfile.read(path).then(data => {

            const credentials = {
                pid: data.PID,
                protocol: data.protocol,
                address: "127.0.0.1",
                port: data.port,
                username: "riot",
                password: data.password,
                auth: Buffer.from(`riot:${data.password}`).toString("base64")
            };

            // Determine if the current running process is client process or game process
            const isGame = LeagueClient.PROCESS_TYPE === "game";

            this.emit("connect", credentials, isGame);
        });
    }

    _onFileRemoved() {
        this.emit("disconnect");
    }
}

export { LeagueClient };
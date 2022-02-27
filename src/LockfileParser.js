/*
|--------------------------------------------------------------------------
| Lockfile Parser
|--------------------------------------------------------------------------
|
| A parser for lockfile files from League of Legends.
|
*/

import FS from "fs-extra";

class LockfileParser {

    get name() {
        return "LockfileParser";
    }

    async parse(path) {

        let file;

        if (Buffer.isBuffer(path)) {
            file = path.toString();
        } else {
            file = await FS.readFile(path, "utf8");
        }

        return file.split(":");
    }

    async read(path) {

        const parts = await this.parse(path);

        return {
            process: parts[0],
            PID: Number(parts[1]),
            port: Number(parts[2]),
            password: parts[3],
            protocol: parts[4]
        };
    }

    async extract(input, output) {

        const file = await this.read(input);
        await FS.outputJson(output, file, { spaces: 2 });
    }

}

export default LockfileParser;
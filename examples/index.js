import { LeagueClient, request, connect } from "../index.js";

const client = new LeagueClient();

/**
 * Client Connected.
 */
client.on("connect", (credentials, isGameProcess) => {

    console.log("Client Connected");

    const con = connect(credentials);

    con.onSocketOpen(() => {
        console.log("Connected to Socket");
    });

    con.subscribe("/lol-gameflow/v1/gameflow-phase", (data, event) => {
        console.log();
    });

    con.subscribe("/lol-gameflow/v1/session", (data, event) => {
        console.log();
    });

    //
    request(credentials, {
        url: "/lol-summoner/v1/current-summoner"
    }).then((data) => {
        console.log();
    });
});

/**
 * Client disconnected.
 */
client.on("disconnect", () => {

    console.log("Client Disconnected");
});

// Start the client
client.start();
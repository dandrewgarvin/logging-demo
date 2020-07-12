const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const winston = require("winston");
const morgan = require("morgan");
const chalk = require("chalk");

const app = express();

app.use(cors());
app.use(bodyParser.json());

const transports = {
  console: new winston.transports.Console({
    level: "info",
    format: winston.format.combine(
      winston.format.json(),
      winston.format.prettyPrint(),
      winston.format.printf((msg) => {
        if (msg.meta && msg.meta.origin === "morgan") {
          return msg.message;
        } else {
          return JSON.stringify(msg, null, 2);
        }
      })
    ),
  }),
  file: new winston.transports.File({
    filename: "info.log",
    level: "info",
    format: winston.format.combine(
      winston.format.printf((msg) => {
        // if log from morgan, remove color before putting into file
        if (msg.meta && msg.meta.origin === "morgan") {
          return msg.message.replace(
            /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
            ""
          );
        } else {
          return JSON.stringify(msg.message, null, 2);
        }
      })
    ),
  }),
};

const logger = winston.createLogger({
  level: "info",
  // general formatting for all transports
  format: winston.format.combine(
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [
    // receives all logs, outputs to console. also to file if on production
    transports.console,
  ],
});

// if on production, save logs to file as well as console by adding another transport method
const PRODUCTION = false;

if (PRODUCTION) {
  logger.add(transports.file);

  // if we wanted to, we could also add a loggly transport here on production
}

// set up morgan passing logs through winston
logger.stream = {
  write: function (message) {
    logger.info({
      message,
      meta: { origin: "morgan" },
    });
  },
};

// initialize morgan logging for all http requests
app.use(
  morgan(
    (tokens, req, res) => {
      let success = true;

      const status = tokens.status(req, res);

      // if bad response http status code
      if (status[0] === "4") {
        success = false;
      }

      const method = tokens.method(req, res);
      let bgColor = "bgBlue";
      let color = "white";

      if (method === "POST") {
        bgColor = "bgMagenta";
      } else if (method === "PUT") {
        bgColor = "bgYellow";
        color = "black";
      } else if (method === "DELETE") {
        bgColor = "bgRedBright";
        color = "black";
      }

      return [
        success
          ? chalk.bgGreen.black(` ${tokens.status(req, res)} `)
          : chalk.bgRed.white(` ${tokens.status(req, res)} `),
        "-",
        tokens["response-time"](req, res),
        "ms",
        "-",
        chalk[bgColor][color](` ${method} `),
        tokens.url(req, res),
        "-",
        tokens.date(req, res),
      ].join(" ");
    },
    {
      stream: logger.stream,
    }
  )
);

app.get("/api/v1/users", (req, res) => {
  // random object
  const complexObject = {
    name: {
      first: "Matthew",
      last: "Setter",
    },
    id: 7,
    employment: "Freelance Technical Writer",
    country: "Germany",
    languages: ["PHP", "Node.js", "Bash", "Ruby", "Python", "Go"],
  };

  /**
   * in production, winston sends log outputs to both, so that while developing we don't have to switch things from debug to info. we only have to use logger.info and things will always be transported to the necessary locations. IE logger.info will always output to the console, while in production it'll output to a file as well (and any other transports we choose to set up)
   *
   * we can also set up loggly as a production transport so that we can analyze usage.
   */

  logger.info(complexObject);

  res.status(200).json({
    success: true,
    error: null,
    data: complexObject,
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});

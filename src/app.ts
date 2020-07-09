import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

/* -------------------------------------------------------------------------- */

export const app = express();

/**
 *  Middlewares
 */

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

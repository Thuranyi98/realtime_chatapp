import { Router } from "express";


export function HealthcheckRoute(app: Router) {
    app.get('/healthcheck', (req, res) => {
        res.send('App is running..');
    });
}
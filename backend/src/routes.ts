import { Router } from "express";
import { HealthcheckRoute } from "./routes/healthcheck.routes";


export function Routes(app: Router) {


    //healthcheck
    HealthcheckRoute(app);

}
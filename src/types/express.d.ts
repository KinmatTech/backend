import { Request, Response, NextFunction } from 'express';

declare module 'express' {
    interface Router {
        get(
            path: string,
            ...handlers: Array<(req: Request, res: Response, next: NextFunction) => any>
        ): Router;

        post(
            path: string,
            ...handlers: Array<(req: Request, res: Response, next: NextFunction) => any>
        ): Router;

        put(
            path: string,
            ...handlers: Array<(req: Request, res: Response, next: NextFunction) => any>
        ): Router;

        delete(
            path: string,
            ...handlers: Array<(req: Request, res: Response, next: NextFunction) => any>
        ): Router;
    }
} 
import {
  Router as IttyRouter, RouterOptions, RouterHints, RouterType as IttyRouterType,
} from 'itty-router';
import { Route } from './types';

export type IRouteEntry = (path: string, ...handlers: Route[]) => RouterType;

export type RouterType = Omit<IttyRouterType, keyof RouterHints> & {
  [key in keyof RouterHints]: IRouteEntry
};

export type IRouter = (opts?: RouterOptions) => RouterType;

export const Router: IRouter = IttyRouter as unknown as IRouter;

/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Router } from './router';
import Docs from './routes/docs';
import Franklin from './routes/franklin';

import type { Context } from './types';

const router = Router();

router
  .get('/(scripts|blocks|styles)/*', Franklin)
  // temp block footer & nav
  .get('/footer.plain.html', () => new Response(null, { status: 404 }))
  .get('/nav.plain.html', () => new Response(null, { status: 404 }))
  .get('/*', Docs);

export default function handleRequest(request: Request, ctx: Context) {
  return router.handle(request, ctx);
}

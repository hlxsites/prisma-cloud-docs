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
import Books from './routes/books';
import Franklin from './routes/franklin';

import type { Context } from './types';
import Media from './routes/media';

export default function handleRequest(request: Request, ctx: Context) {
  const router = Router({ base: ctx.env.BASE_PATH });

  router
    .get('/(scripts|blocks|styles)/*', Franklin)
    .get('/*/_graphics/*', Media)
    .get('/nav.*.html', Franklin)
    .get('/footer.*.html', Franklin)
    .get('/book.*.html', Books)
    .get('/*', Docs);

  return router.handle(request, ctx) as Promise<Response | undefined>;
}

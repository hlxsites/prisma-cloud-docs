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
import { slug } from 'github-slugger';

type Occurrences = { [key: string]: number };

export default class IDSlugger {
  private readonly occurrences: Occurrences;

  constructor() {
    this.occurrences = {} as Occurrences;
  }

  /**
     * Generate a unique slug.
     * @param  {string} value String of text to slugify
     * @return {string}       A unique slug string
     */
  slug(value: string) {
    let id = slug(value)
    // remove leading numbers
      .replace(/^\d+-+/, '');

    // resolve collisions
    const original = id;
    while (id in this.occurrences) {
      this.occurrences[original] += 1;
      id = `${original}-${this.occurrences[original]}`;
    }
    this.occurrences[id] = 0;
    return id;
  }
}

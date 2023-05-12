/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-member-access,
                  @typescript-eslint/no-unsafe-call */
import extractRawBook from '../../../tools/extract-raw-book.js';

type ParentTopic = {
  name: string;
  dir: string;
  topics: Topic[];
}

type LeafTopic = {
  name: string;
  file: string;
}

type Topic = ParentTopic | LeafTopic;

const multiSheetTemplate = (sheets: { name: string; data: any[] }[]) => {
  return {
    ':version': 3,
    ':names': [
      'default',
      'chapters',
      'topics',
    ],
    ':type': 'multi-sheet',
    ...Object.fromEntries(sheets.map(({ name, data }) => {
      return [name, {
        data,
        total: data.length,
        offset: 0,
        limit: data.length,
      }];
    })),
  };
};

const isParentTopic = (topic: Topic): topic is ParentTopic => {
  return !!(topic as ParentTopic).topics;
};

// group book into multiple sheets:
//   1. default is used for book metadata (eg. title)
//   2. chapters is used for all unique chapters
//   3. topics is used for all topics,
//      each with a reference to their parent chapter's key and parent topic's key (if nested)
const book2json = (content: string): Record<string, unknown> => {
  const raw = extractRawBook(content);

  const book = [{
    title: raw?.book?.title,
    version: raw?.book?.version,
    author: raw?.book?.author,
  }];

  const chapters = [];
  const topics = [];

  const processTopic = (chapterKey: string, topic: Topic, parentKey?: string) => {
    if (isParentTopic(topic)) {
      // nested topics, recurse
      const topicKey: string = topic.dir.replace(/_/g, '-').toLowerCase(); // todo: sanitize better
      topic.topics.forEach((subtopic) => processTopic(chapterKey, subtopic, parentKey ? `${parentKey}/${topicKey}` : topicKey));
      return;
    }

    const topicKey = topic.file.split('.').slice(0, -1).join('.').toLowerCase();
    topics.push({
      chapter: chapterKey,
      name: topic.name,
      key: topicKey,
      ...(parentKey ? { parent: parentKey } : {}),
    });
  };

  raw.chapters.forEach((chapter) => {
    const chapterKey: string = chapter.dir.replace(/_/g, '-').toLowerCase();
    chapters.push({
      key: chapterKey,
      name: chapter.name,
    });
    chapter.topics.forEach((topic: Topic) => processTopic(chapterKey, topic));
  });

  return multiSheetTemplate([
    {
      name: 'default',
      data: book,
    },
    {
      name: 'chapters',
      data: chapters,
    },
    {
      name: 'topics',
      data: topics,
    },
  ]);
};

export default book2json;

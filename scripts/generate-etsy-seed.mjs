import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const P = 'Peptide Planner, Peptide Tracker, GLP1 Tracker, Peptide Storage, Journal, Diabetes Insulin Pen Tracker';
const PS = 'Peptide Planner Peptide Tracker GLP1 Tracker Peptide Storage Journal Diabetes Insulin Pen Tracker';
const PR = 'Peptide Research Planner, GLP1 Tracker, 7x10 Journal';
const PG = 'Peptide Planner Peptide Tracker GLP1 Tracker Goodnotes Hyperlinked Planner Peptide Storage Journal Diabetes Insulin';

/** [authorName, createdAt, rating, productName, body] — scraped from Etsy pages 1–5 */
const rows = [
  ['Etsy buyer', '2026-04-23', 5, PR, 'this whats great and received fast'],
  ['Hillary', '2026-02-25', 5, PS, 'I like this little journal, very high quality. It might be nice if there were some pages dedicated to making detailed notes, but overall I really like it.'],
  ['Etsy buyer', '2026-02-23', 5, P, 'Great resource! Love using this!'],
  ['Candace', '2026-01-19', 5, PS, 'Love this journal. Great for keeping all my information!'],
  ['Etsy buyer', '2025-12-11', 3, PS, "It's very good quality but it's a lot smaller than I thought and it's just not what I like. I thought I would like it, but I'm more old school and like my spreadsheet printed off with the entire list"],
  ['Michaelle', '2025-10-29', 5, PS, 'Exactly what we were looking for.'],
  ['Michaelle', '2025-10-29', 5, PS, 'Perfect! Exactly what we were looking for. Thank you!'],
  ['Kendra', '2025-10-28', 5, PS, "Love this book. I've gotten a few others gifts too."],
  ['Margaret', '2025-10-24', 5, P, 'Perfect, as described. Would order again'],
  ['Liz', '2025-10-17', 5, P, 'Great addition to the pep planner'],
  ['Syd', '2025-10-11', 5, PS, 'This is a great tracker and has so much to it. I definitely recommend and will be buying again.'],
  ['Natasha', '2025-10-06', 5, PG, "Just what I was looking for because it is specific to peptides and offers tracking the other journals don't provide."],
  ['Etsy buyer', '2025-10-04', 5, P, 'This journal exceeds my expectations and is so helpful for my research journey and keeping track of everything! Highly recommend!'],
  ['Jessica', '2025-09-15', 5, P, 'Great product would order again'],
  ['Bonnie', '2025-09-12', 5, P, 'Great product!! Quick shipping! Perfect'],
  ['Sondra', '2025-09-11', 5, P, 'Cool product. Took a while to receive the item. As described.'],
  ['Kirsten', '2025-09-06', 5, P, "This is a great way to keep yourself organized while you're on a health journey. I really recommend this. It's been very useful."],
  ['Kirsten', '2025-08-26', 5, P, 'Great planner! Absolutely love it!'],
  ['Raz', '2025-08-23', 5, P, 'Fantastic product. Perfect for tracking everything for Pep research!'],
  ['Jessica', '2025-08-20', 5, P, "I loved it and it's so helpful and simple to follow"],
  ['Ashlee', '2025-08-02', 5, P, 'Just what I was looking for. Wish I would have bought it in the beginning!!!'],
  ['Lorna', '2025-07-30', 5, P, 'Planner is a great quality item'],
  ['Jen', '2025-07-27', 5, P, 'The book is fantastic and I love that I can can havr dates I can write in if I cycle off for a little.'],
  ['Sonya', '2025-07-27', 5, P, 'This peptide planner is exactly what I needed. It makes it so much easier to keep track of my injections, doses, and notes. The layout is clean, easy to use, and makes my routine more organized. Great quality!'],
  ['Cindi', '2025-07-26', 5, P, 'Love the book! Just what I needed 😁'],
  ['Liz', '2025-07-19', 5, P, 'Such a handy tracker - so many different sections. Perfect for planning and organizing your peptides!'],
  ['Kerri', '2025-07-17', 5, P, 'This makes keeping track of my peptide dosages and dates so much easier than penciling it in on a wall calendar. It has weekly schedules as well as reconstitution pages, peptide inventory & vendors.'],
  ['Kim', '2025-07-16', 5, P, 'I purchased the cheerful vibrant lemon design. Very nice quality and detailed journal for keeping track of my research. Thank you'],
  ['Alena', '2025-07-14', 5, P, 'Super cute. Will be very useful'],
  ['Courtney', '2025-07-11', 5, P, 'Looking forward to using it!'],
  ['Courtney', '2025-07-11', 5, P, 'Just what I was looking for! Thank you!'],
  ['Gwen', '2025-07-11', 5, P, 'Love this book !! Will defintely be helpful in my peptide journey !!'],
  ['Sarah', '2025-07-09', 5, P, 'I love this planner! It has everything you need for your peptide journey'],
  ['Paige', '2025-07-09', 5, P, 'The item was very good quality. It was as described and is exactly what I needed. I highly recommend this Peptide Planner.'],
  ['Maria', '2025-07-09', 5, P, 'Please with both items both as described'],
  ['Leilani', '2025-07-07', 5, P, 'Great planner. I use it everyday.'],
  ['Stephanie', '2025-06-30', 5, P, 'Love the color and all the pages'],
  ['Julie', '2025-06-29', 5, P, "I love this! This book is so awesome and I can't wait to use it. Highly recommend"],
  ['Victoria', '2025-06-26', 5, P, ''],
  ['stephanie', '2025-06-25', 5, P, "I love the product! I didn't realize they did not ship immediately. I never received a response when I reached out inquiring about the ship date."],
  ['Victoria', '2025-06-22', 5, P, 'Great product. Would buy from again.'],
  ['Andrea', '2025-06-21', 5, P, 'As described. Even better than expected. Very detailed.'],
  ['Karin', '2025-06-21', 1, P, 'I mean is this a joke?? I got tiny stickers and a plastic tiny piece. This was supposed to be a pep planner'],
  ['Rose', '2025-06-14', 5, P, 'It helps me stay on top of my research perfectly. Love that everything is need is all together'],
  ['Rose', '2025-06-14', 4, P, 'Loved my order, very useful.'],
  ['Kendra', '2025-06-06', 5, P, 'Very helpful planner with all the info you need.'],
  ['Carla', '2025-06-02', 4, P, 'The quality of the organizer matched the description.'],
  ['samantha', '2025-06-02', 4, P, 'Wished I would of gotten the bigger one'],
  ['Jessica', '2025-05-31', 5, P, 'Great item ! Very organized !'],
  ['Mariah', '2025-05-20', 5, P, 'This planner has everything you need and plenty of space!'],
  ['Regan', '2025-05-20', 5, P, 'I liked the product overall'],
  ['Ritual', '2025-05-14', 5, P, 'Love it! Thank you so much…!'],
  ['Lauren', '2025-05-09', 5, P, ''],
  ['Etsy buyer', '2025-05-03', 5, P, 'Absolutely love it! Plenty of room to write on.'],
  ['Katrina', '2025-04-24', 5, P, 'Great useful information easy to understand how to use'],
  ['Katrina', '2025-04-21', 5, P, 'Useful lots of space for writing'],
  ['Mechelle', '2025-04-21', 5, P, 'Hello. I first wish to apologize for messaging you regarding the timely(my terms lol) delivery service, this peptide planner was so worth the wait! It is beautifully crafted. Nice thick pages.. organized perfectly for my needs. Thank you!'],
  ['Rita', '2025-04-15', 4, P, 'Handy little research guide & well-made'],
  ['Bam', '2025-03-17', 5, P, 'Compared to anything out there, this is a fantastic planner. My only feedback would be to use a thicker quality paper, or make a digital option available so people can print on their preferred paper quality.'],
  ['Taci', '2025-03-16', 5, P, 'Great Quality Love it! Very helpful to keep notes and stay organized'],
  ['Rachael', '2025-02-28', 1, P, 'Ordered on Feb 19th and still says label printed 9 days later. Has not been shipped.'],
  ['Wendi', '2025-02-23', 5, P, 'This peptide book is awesome!! Wish I had it at the beginning of my journey.'],
  ['Calvin', '2025-01-15', 5, P, 'This is a great product'],
  ['Megan', '2025-01-05', 5, P, 'The smaller size was perfect for me. Perfect little research companion to keep a tidy log.'],
  ['Estell', '2024-12-02', 4, P, 'The larger planner is big enough to write in and track all your peptides. Works good'],
];

const esc = (s) => JSON.stringify(s);
const lines = rows.map((r, i) => {
  const id = String(i + 1).padStart(3, '0');
  return `  { seedId: 'etsy-${id}', authorName: ${esc(r[0])}, createdAt: '${r[1]}', rating: ${r[2]}, productName: ${esc(r[3])}, body: ${esc(r[4])} },`;
});

const out = `/**
 * Etsy shop reviews — ThePepPlannerCo (pages 1–5), import via Admin → Shop → Reviews.
 * seedId is used as Firestore document ID for idempotent re-import (merge).
 */
export const ETSY_REVIEWS_SEED = [
${lines.join('\n')}
];
`;

const dest = path.join(__dirname, '../src/data/etsyReviewsSeed.js');
fs.writeFileSync(dest, out);
console.log(`Wrote ${rows.length} reviews to ${dest}`);

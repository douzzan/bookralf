ABOUT PAGE UPDATE — unzip over the project root (replaces same-named files).

Then run, in the project folder:
  npx prisma migrate dev --name about_page     (local; creates the 4 new tables)
  npm run seed                                  (optional: loads draft About content; safe to re-run)

For Ralf's new Supabase (production DB), with its DATABASE_URL / DIRECT_URL set:
  npx prisma migrate deploy
Then open /staff/content and press "Load starter content" if the page is empty.

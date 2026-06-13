import { createCorsair } from 'corsair';
import { gmail } from '@corsair-dev/gmail';
import { googlecalendar } from '@corsair-dev/googlecalendar';
import { env } from '@/env';
import { db } from '@/server/db';

export const corsair = createCorsair({
    plugins: [gmail(), googlecalendar()],
    database: db.$client,
    kek: env.CORSAIR_KEK,
    multiTenancy: true,
});
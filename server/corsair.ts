import { Pool } from 'pg';
import { createCorsair } from 'corsair';
import { gmail } from '@corsair-dev/gmail';
import {googlecalendar} from '@corsair-dev/googlecalendar';

const db = new Pool({ connectionString: process.env.DATABASE_URL });

export const corsair = createCorsair({
    plugins: [gmail(), googlecalendar()],
    database: db,
    kek: process.env.CORSAIR_KEK!,
    multiTenancy: false,
});
import { describe, it, expect } from 'vitest';
import { Mapper } from '../Mapper.js';

describe('Mapper', () => {
    interface Source {
        id: number;
        name: string;
        email: string;
        isActive: boolean;
    }

    interface Target {
        userId: number;
        fullName: string;
        contactEmail: string;
        status: string;
    }

    it('should map fields using property names and functions', () => {
        const mapper = Mapper.create<Source, Target>()
            .addField('userId', 'id')
            .addField('fullName', 'name')
            .addField('contactEmail', (src) => src.email.toLowerCase())
            .addField('status', (src) => (src.isActive ? 'Active' : 'Inactive'));

        const source: Source = {
            id: 1,
            name: 'John Doe',
            email: 'JOHN@EXAMPLE.COM',
            isActive: true,
        };

        const result = mapper.map(source);

        expect(result).toEqual({
            userId: 1,
            fullName: 'John Doe',
            contactEmail: 'john@example.com',
            status: 'Active',
        });
    });

    it('should map an array of objects', () => {
        const mapper = Mapper.create<Source, Target>()
            .addField('userId', 'id')
            .addField('fullName', 'name')
            .addField('contactEmail', 'email')
            .addField('status', () => 'Unknown');

        const sources: Source[] = [
            { id: 1, name: 'A', email: 'a@a.com', isActive: true },
            { id: 2, name: 'B', email: 'b@b.com', isActive: false },
        ];

        const results = mapper.mapArray(sources);

        expect(results).toHaveLength(2);
        expect(results[0].userId).toBe(1);
        expect(results[1].userId).toBe(2);
    });
});

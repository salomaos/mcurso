// Insert que devolve o id gerado, em qualquer dialeto.
//
// O SQLite tem `.returning()` no builder do insert; o MySQL não expõe equivalente
// (`insert ... returning` é do MariaDB, e o drizzle só oferece `$returningId()`,
// que devolve a PK pelo `insertId` do driver). Todo insert do app precisa só do
// id — nenhum precisa da linha inteira —, então um lugar só resolve os dois, e os
// corpos de transação continuam idênticos nos dois dialetos.

import { dialeto } from './index';

type ConstrutorDeInsert = {
	returning: () => PromiseLike<{ id: number }[]>;
};

export async function inserirId(construtor: ConstrutorDeInsert): Promise<number> {
	if (dialeto === 'mysql') {
		const linhas = await (
			construtor as unknown as { $returningId: () => PromiseLike<{ id: number }[]> }
		).$returningId();
		return linhas[0].id;
	}

	return (await construtor.returning())[0].id;
}

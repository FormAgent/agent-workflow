export interface User {
	id: number;
	name: string;
	email: string;
}

export type Response<T> = {
	data: T;
	error?: string;
};

export enum Status {
	SUCCESS = "success",
	ERROR = "error",
}

export interface Role {
    id: string
}

export interface Group {
    id: string
}

export interface Product {
    id: string
    roles: Role[]
    groups: Group[]
}

export interface AccountRequest {
    firstName: string;
    lastName: string;
    email: string;
    isEnabled: boolean;
    isAdmin: boolean;
    products: Product[];
}
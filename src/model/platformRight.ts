import { Attributes } from "@sailpoint/connector-sdk";

export class PlatformRight {
    identity: string
    uuid: string
    type: string = 'platformRight'
    attributes: Attributes

    constructor(object: any) {
        this.attributes = {
            displayName: object.displayName
        }
        this.identity = this.attributes.displayName as string
        this.uuid = this.attributes.displayName as string
    }
}
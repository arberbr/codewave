export class TokenManager {
    static countTokens(text: string): number {
        return text.length / 4; // Rough estimate
    }
}

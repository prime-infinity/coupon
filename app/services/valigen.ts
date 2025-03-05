import supabase from "../supabase";

// Generate a secure hash for user details
export function generateUserHash(email?: string, phone?: string): string {
    // Prefer email if both are provided
    const identifier = email || phone;
    if (!identifier) {
      throw new Error('Either email or phone must be provided');
    }
  
    // Simple hash generation (you might want to use a more secure method)
    return Buffer.from(identifier).toString('base64');
  }
  
  // Validate user details against the promoted table
  export async function validatePromoConfirmation(
    promoId: string, 
    userHash: string
  ): Promise<{
    isValid: boolean;
    isUsed?: boolean;
    userData?: any;
  }> {
    try {
      // Find the user in the promoted table
      const { data, error } = await supabase
        .from('promoted')
        .select('*')
        .eq('promo_id', promoId)
        .or(`email.eq.${atob(userHash)},phone.eq.${atob(userHash)}`)
        .single();
  
      if (error || !data) {
        return { isValid: false };
      }
  
      return {
        isValid: true,
        isUsed: data.is_used,
        userData: data
      };
    } catch (err) {
      console.error('Validation error:', err);
      return { isValid: false };
    }
  }
  
  // Generate confirmation URL
  export function generateConfirmationUrl(
    baseUrl: string, 
    promoId: string, 
    email?: string, 
    phone?: string
  ): string {
    const userHash = generateUserHash(email, phone);
    return `${baseUrl}/confirm/${promoId}?user=${userHash}`;
  }
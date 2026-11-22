export type TenantStatus = 'DEMO' | 'TRIAL' | 'ACTIVE' | 'PAUSED';
export type StaffRole = 'OWNER' | 'WAITER' | 'KITCHEN';
export type TableStatus = 'FREE' | 'ORDERING' | 'PENDING_APPROVAL' | 'EATING' | 'HELP' | 'BILL';
export type SpiceLevel = 'NONE' | 'MILD' | 'MEDIUM' | 'SPICY';
export type OrderStatus = 'PENDING_APPROVAL' | 'IN_KITCHEN' | 'READY' | 'SERVED' | 'CANCELLED';
export type ItemPrepStatus = 'QUEUED' | 'PREPARING' | 'READY' | 'SERVED';
export type RequestType = 'WATER' | 'NAPKINS' | 'WAITER' | 'BILL';
export type RequestStatus = 'OPEN' | 'RESOLVED';
export type PaymentMethod = 'UPI' | 'CARD' | 'CASH';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface DishVariant {
    name: string;
    price_delta: number;
}

export interface TableGuest {
    guest_id: string;
    name: string;
}

export interface Restaurant {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    cover_image_url: string | null;
    primary_color: string;
    cuisine_preset: string | null;
    tax_percentage: number;
    wifi_ssid: string | null;
    wifi_password: string | null;
    upi_id: string | null;
    google_review_url: string | null;
    status: TenantStatus;
    demo_expires_at: string | null;
    owner_user_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface StaffUser {
    id: string;
    restaurant_id: string;
    name: string;
    role: StaffRole;
    pin_code: string;
    is_active: boolean;
    created_at: string;
}

export interface KitchenStation {
    id: string;
    restaurant_id: string;
    name: string;
    sort_order: number;
    created_at: string;
}

export interface RestaurantTable {
    id: string;
    restaurant_id: string;
    table_code: string;
    display_name: string;
    capacity: number;
    status: TableStatus;
    active_session_id: string | null;
    created_at: string;
}

export interface MenuCategory {
    id: string;
    restaurant_id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
}

export interface MenuItem {
    id: string;
    restaurant_id: string;
    category_id: string;
    station_id: string | null;
    name: string;
    description: string | null;
    base_price: number;
    image_url: string | null;
    is_veg: boolean;
    spice: SpiceLevel;
    allergens: string[];
    variants: DishVariant[];
    prep_time_mins: number;
    is_available: boolean;
    is_bestseller: boolean;
    created_at: string;
}

export interface TableSession {
    id: string;
    restaurant_id: string;
    table_id: string;
    guests: TableGuest[];
    is_active: boolean;
    started_at: string;
    closed_at: string | null;
}

export interface CartItem {
    id: string;
    restaurant_id: string;
    session_id: string;
    menu_item_id: string;
    added_by_guest_id: string;
    added_by_name: string;
    variant_name: string | null;
    unit_price: number;
    quantity: number;
    notes: string | null;
    created_at: string;
}

export interface Order {
    id: string;
    restaurant_id: string;
    table_id: string;
    session_id: string;
    order_number: number;
    placed_by_name: string;
    status: OrderStatus;
    subtotal: number;
    approved_at: string | null;
    ready_at: string | null;
    created_at: string;
}

export interface OrderItem {
    id: string;
    restaurant_id: string;
    order_id: string;
    menu_item_id: string | null;
    station_id: string | null;
    item_name: string;
    variant_name: string | null;
    quantity: number;
    unit_price: number;
    ordered_by_name: string;
    notes: string | null;
    prep_status: ItemPrepStatus;
    created_at: string;
}

export interface ServiceRequest {
    id: string;
    restaurant_id: string;
    table_id: string;
    session_id: string | null;
    type: RequestType;
    status: RequestStatus;
    created_at: string;
    resolved_at: string | null;
}

export interface Payment {
    id: string;
    restaurant_id: string;
    session_id: string;
    paid_by_name: string | null;
    subtotal: number;
    tax_amount: number;
    tip_amount: number;
    total_amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    razorpay_order_id: string | null;
    razorpay_payment_id: string | null;
    created_at: string;
}

export interface Review {
    id: string;
    restaurant_id: string;
    session_id: string | null;
    guest_name: string | null;
    rating: number;
    comment: string | null;
    redirected_to_google: boolean;
    created_at: string;
}
import { View, Text, ScrollView, Pressable, Modal, StyleSheet, FlatList } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const ActiveOrders = () => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveOrders = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
          console.log('No user logged in');
          setLoading(false);
          return;
        }

        const db = getFirestore();
        const ordersRef = collection(db, 'orders');
        
        // Query for orders including completed status
        const q = query(
          ordersRef,
          where('userId', '==', currentUser.uid),
          where('status', 'in', ['pending', 'processing', 'shipped', 'out_for_delivery', 'completed']),
          orderBy('createdAt', 'desc')
        );

        // Set up real-time listener for orders
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const orders = [];
          querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
          });
          
          setActiveOrders(orders);
          setLoading(false);
        }, (error) => {
          console.error('Error listening to orders:', error);
          setLoading(false);
        });

        // Clean up listener on unmount
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching active orders:', error);
        setLoading(false);
      }
    };

    fetchActiveOrders();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#F59E0B'; // Amber
      case 'processing':
        return '#3B82F6'; // Blue
      case 'shipped':
        return '#8B5CF6'; // Purple
      case 'out_for_delivery':
        return '#22C55E'; // Green
      case 'completed':
        return '#10B981'; // Green
      case 'cancelled':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'clock';
      case 'processing':
        return 'loader';
      case 'shipped':
        return 'package';
      case 'out_for_delivery':
        return 'truck';
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'x-circle';
      default:
        return 'help-circle';
    }
  };

  const formatStatusText = (status) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatPrice = (price) => {
    return `₹${parseFloat(price).toFixed(2)}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOrderPress = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const renderOrderItem = ({ item }) => (
    <Pressable
      style={styles.orderCard}
      onPress={() => handleOrderPress(item)}
      android_ripple={{ color: '#f3f4f6' }}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Feather name="shopping-bag" size={16} color="#4B5563" />
          <Text style={styles.orderId} numberOfLines={1}>
            Order
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Feather name={getStatusIcon(item.status)} size={12} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {formatStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.orderItemsCount}>
          {item.items?.length || 0} {item.items?.length === 1 ? 'item' : 'items'}
        </Text>
        <Text style={styles.orderTotal}>
          {formatPrice(item.priceInfo?.total || '0')}
        </Text>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderDate}>
          {formatDate(item.createdAt)}
        </Text>
        <Pressable style={styles.viewDetailsButton}>
          <Text style={styles.viewDetails}>View Details</Text>
        </Pressable>
      </View>
    </Pressable>
  );

  const OrderDetailsModal = () => (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Details</Text>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Feather name="x" size={20} color="#059669" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            {selectedOrder && (
              <>
                <View style={[styles.orderStatusBanner, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                  <Feather name={getStatusIcon(selectedOrder.status)} size={20} color="#FFFFFF" />
                  <Text style={styles.orderStatusText}>
                    {formatStatusText(selectedOrder.status)}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Order Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedOrder.createdAt)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order Type</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.orderType === 'subscription' ? 'Subscription' : 'One-time'}
                    </Text>
                  </View>
                  {selectedOrder.orderType === 'subscription' && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Frequency</Text>
                        <Text style={styles.detailValue}>{selectedOrder.frequency || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Duration</Text>
                        <Text style={styles.detailValue}>{selectedOrder.duration || 'N/A'}</Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Items</Text>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, index) => (
                      <View key={index} style={styles.orderItemCard}>
                        <View style={styles.orderItemDetails}>
                          <Text style={styles.orderItemName}>{item.name}</Text>
                          <Text style={styles.orderItemQuantity}>Qty: {item.quantity}</Text>
                        </View>
                        <Text style={styles.orderItemPrice}>
                          {formatPrice(item.price * item.quantity)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noItems}>No items found</Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Price Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Subtotal</Text>
                    <Text style={styles.detailValue}>
                      {formatPrice(selectedOrder.priceInfo?.subtotal || '0')}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Savings</Text>
                    <Text style={[styles.detailValue, styles.savingsText]}>
                      - {formatPrice(selectedOrder.priceInfo?.savings || '0')}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      {formatPrice(selectedOrder.priceInfo?.total || '0')}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Delivery Address</Text>
                  <Text style={styles.addressText}>{selectedOrder.address || 'Address not available'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Payment Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Method</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.paymentDetails?.paymentMethod || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.paymentDetails?.status === 'success' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.actionSection}>
                  <Pressable style={styles.actionButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.actionButtonText}>Close</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <View style={styles.noOrdersContainer}>
        <Feather name="package" size={24} color="#9CA3AF" />
        <Text style={styles.noOrdersText}>No active orders</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Active Orders</Text>
      <FlatList
        data={activeOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        contentContainerStyle={styles.ordersList}
      />
      <OrderDetailsModal />
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      marginTop: 16,
      flex: 1,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1F2937',
      paddingHorizontal: 16,
    },
    loadingContainer: {
      padding: 16,
      alignItems: 'center',
    },
    loadingText: {
      color: '#6B7280',
      fontWeight: '500',
    },
    noOrdersContainer: {
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      marginHorizontal: 16,
    },
    noOrdersText: {
      color: '#6B7280',
      marginTop: 8,
      fontWeight: '500',
    },
    ordersList: {
      paddingHorizontal: 16,
    },
    orderCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#F3F4F6',
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    orderIdContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    orderId: {
      fontSize: 15,
      fontWeight: '600',
      color: '#4B5563',
      marginLeft: 6,
      flex: 1,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#EFF6FF',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '500',
      color: '#3B82F6',
      marginLeft: 4,
    },
    orderInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    orderItemsCount: {
      fontSize: 14,
      color: '#6B7280',
    },
    orderTotal: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1F2937',
    },
    orderFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },
    orderDate: {
      fontSize: 12,
      color: '#6B7280',
    },
    viewDetailsButton: {
      backgroundColor: '#D1FAE5',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
    },
    viewDetails: {
      color: '#059669',
      fontSize: 12,
      fontWeight: '500',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1F2937',
    },
    closeButton: {
      padding: 4,
    },
    modalBody: {
      padding: 16,
    },
    orderStatusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    orderStatusText: {
      color: '#FFFFFF',
      fontWeight: '600',
      marginLeft: 8,
      fontSize: 16,
    },
    detailSection: {
      marginTop: 20,
    },
    detailSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1F2937',
      marginBottom: 8,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    detailLabel: {
      color: '#6B7280',
      fontSize: 14,
    },
    detailValue: {
      color: '#1F2937',
      fontSize: 14,
      fontWeight: '500',
    },
    totalValue: {
      color: '#1F2937',
      fontSize: 16,
      fontWeight: '600',
    },
    savingsText: {
      color: '#059669',
    },
    orderItemCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    orderItemDetails: {
      flex: 1,
    },
    orderItemName: {
      fontSize: 14,
      fontWeight: '500',
      color: '#1F2937',
      marginBottom: 4,
    },
    orderItemQuantity: {
      fontSize: 12,
      color: '#6B7280',
    },
    orderItemPrice: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1F2937',
    },
    noItems: {
      fontSize: 14,
      color: '#6B7280',
      fontStyle: 'italic',
    },
    addressText: {
      fontSize: 14,
      color: '#1F2937',
      lineHeight: 20,
    },
    actionSection: {
      marginTop: 20,
    },
    actionButton: {
      backgroundColor: '#059669',
      paddingVertical: 12,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 16,
    }
  });
  
  export default ActiveOrders;
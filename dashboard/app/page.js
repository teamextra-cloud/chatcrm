'use client';

import { useState, useCallback } from 'react';
import CustomerList from '../components/customer/CustomerList';
import ChatWindow from '../components/chat/ChatWindow';
import CustomerProfilePanel from '../components/customer/CustomerProfilePanel';
import { AppLayout } from '../components/layout/AppLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { getCustomers } from '../lib/api';

export default function Home() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await getCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <AppLayout
      sidebar={<Sidebar />}
      customerList={
        <CustomerList
          customers={customers}
          setCustomers={setCustomers}
          selectedId={selected?.id}
          onSelect={setSelected}
          fetchCustomers={fetchCustomers}
        />
      }
      chatWindow={
        <ChatWindow
          customer={selected}
          customers={customers}
          setCustomers={setCustomers}
        />
      }
      customerProfile={<CustomerProfilePanel customer={selected} />}
    />
  );
}


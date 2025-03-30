'use client'
import Image from "next/image";
import styles from "./page.module.css";
import { useState, useEffect } from "react";

export default function Home() {

  const [htmlOutput, setHtmlOutput] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('http://46.101.7.7:3000/api/renderer', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const blocks = await response.json();
      console.log(blocks); // Handle the fetched data as needed
      setHtmlOutput(blocks);
    };

    fetchData();
  }, []);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div dangerouslySetInnerHTML={{ __html: htmlOutput }} />
      </main>
    </div>
  );
}

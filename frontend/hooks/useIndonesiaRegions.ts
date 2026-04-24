import { useState, useEffect, useMemo } from 'react';

interface Province {
    id: string;
    name: string;
}

interface City {
    id: string;
    province_id: string;
    name: string;
}

interface District {
    id: string;
    regency_id: string;
    name: string;
}

interface Village {
    id: string;
    district_id: string;
    name: string;
}

const API_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api';

export function useIndonesiaRegions() {
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [villages, setVillages] = useState<Village[]>([]);
    
    const [selectedProvince, setSelectedProvince] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedDistrict, setSelectedDistrict] = useState<string>('');
    
    const [loading, setLoading] = useState({
        provinces: false,
        cities: false,
        districts: false,
        villages: false,
    });

    useEffect(() => {
        loadProvinces();
    }, []);

    const loadProvinces = async () => {
        setLoading(prev => ({ ...prev, provinces: true }));
        try {
            const response = await fetch(`${API_BASE}/provinces.json`);
            const data = await response.json();
            setProvinces(data);
        } catch (error) {
            console.error('Failed to load provinces:', error);
        } finally {
            setLoading(prev => ({ ...prev, provinces: false }));
        }
    };

    const loadCities = async (provinceId: string) => {
        if (!provinceId) return;
        setLoading(prev => ({ ...prev, cities: true }));
        try {
            const response = await fetch(`${API_BASE}/regencies/${provinceId}.json`);
            const data = await response.json();
            setCities(data);
        } catch (error) {
            console.error('Failed to load cities:', error);
        } finally {
            setLoading(prev => ({ ...prev, cities: false }));
        }
    };

    const loadDistricts = async (cityId: string) => {
        if (!cityId) return;
        setLoading(prev => ({ ...prev, districts: true }));
        try {
            const response = await fetch(`${API_BASE}/districts/${cityId}.json`);
            const data = await response.json();
            setDistricts(data);
        } catch (error) {
            console.error('Failed to load districts:', error);
        } finally {
            setLoading(prev => ({ ...prev, districts: false }));
        }
    };

    const loadVillages = async (districtId: string) => {
        if (!districtId) return;
        setLoading(prev => ({ ...prev, villages: true }));
        try {
            const response = await fetch(`${API_BASE}/villages/${districtId}.json`);
            const data = await response.json();
            setVillages(data);
        } catch (error) {
            console.error('Failed to load villages:', error);
        } finally {
            setLoading(prev => ({ ...prev, villages: false }));
        }
    };

    const provinceOptions = useMemo(() => {
        return provinces.map(p => ({
            value: p.name,
            label: p.name,
            id: p.id
        }));
    }, [provinces]);

    const cityOptions = useMemo(() => {
        return cities.map(c => ({
            value: c.name,
            label: c.name,
            id: c.id
        }));
    }, [cities]);

    const districtOptions = useMemo(() => {
        return districts.map(d => ({
            value: d.name,
            label: d.name,
            id: d.id
        }));
    }, [districts]);

    const villageOptions = useMemo(() => {
        return villages.map(v => ({
            value: v.name,
            label: v.name,
            id: v.id
        }));
    }, [villages]);

    const handleProvinceChange = (provinceName: string) => {
        setSelectedProvince(provinceName);
        const province = provinces.find(p => p.name === provinceName);
        if (province) {
            loadCities(province.id);
            setCities([]);
            setDistricts([]);
            setVillages([]);
            setSelectedCity('');
            setSelectedDistrict('');
        }
    };

    const handleCityChange = (cityName: string) => {
        setSelectedCity(cityName);
        const city = cities.find(c => c.name === cityName);
        if (city) {
            loadDistricts(city.id);
            setDistricts([]);
            setVillages([]);
            setSelectedDistrict('');
        }
    };

    const handleDistrictChange = (districtName: string) => {
        setSelectedDistrict(districtName);
        const district = districts.find(d => d.name === districtName);
        if (district) {
            loadVillages(district.id);
            setVillages([]);
        }
    };

    return {
        provinceOptions,
        cityOptions,
        districtOptions,
        villageOptions,
        handleProvinceChange,
        handleCityChange,
        handleDistrictChange,
        loading,
        selectedProvince,
        selectedCity,
        selectedDistrict,
    };
}

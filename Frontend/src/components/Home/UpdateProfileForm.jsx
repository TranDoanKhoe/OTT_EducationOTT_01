import React, { useState } from "react";
import { toast } from "react-toastify";
import { updateUserProfile } from "../../api/user";

// Form section used by profile modal to submit user profile updates.
const UpdateProfileForm = ({ profileData, onSubmit, onCancel }) => {
  const [firstName, setFirstName] = useState(profileData?.firstName || "");
  const [lastName, setLastName] = useState(profileData?.lastName || "");
  const [email, setEmail] = useState(profileData?.email || "");
  const [phone, setPhone] = useState(profileData?.phone || "");
  const [day, setDay] = useState(profileData?.birthday?.split("-")[2] || "");
  const [month, setMonth] = useState(
    profileData?.birthday?.split("-")[1] || "",
  );
  const [year, setYear] = useState(profileData?.birthday?.split("-")[0] || "");
  const [gender, setGender] = useState(profileData?.gender || "");
  const [avatar, setAvatar] = useState(null);

  const handleAvatarChange = (e) => {
    setAvatar(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    const updatedData = {
      userId: profileData?.userId,
      firstName,
      lastName,
      email,
      phone,
      gender,
      birthday: formattedDate,
      avatar, // sẽ cần xử lý multipart nếu backend yêu cầu
    };

    try {
      const result = await updateUserProfile(updatedData);
      if (result) {
        toast.success("Cập nhật hồ sơ thành công!");
        onSubmit(result);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error("Có lỗi khi cập nhật hồ sơ vui lòng kiểm tra lại.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi cập nhật hồ sơ.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Thông tin cơ bản */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Họ
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Số điện thoại
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent"
          />
        </div>
      </div>

      {/* Ngày sinh */}
      <div className="flex gap-2">
        <div className="flex-[3]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ngày
          </label>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent"
          >
            <option value="">Chọn</option>
            {[...Array(31)].map((_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-[3]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tháng
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent"
          >
            <option value="">Chọn</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-[4]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Năm
          </label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent"
          >
            <option value="">Chọn</option>
            {[...Array(100)].map((_, i) => {
              const yearValue = String(new Date().getFullYear() - i);
              return (
                <option key={yearValue} value={yearValue}>
                  {yearValue}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Giới tính */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Giới tính
        </label>
        <div className="flex gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="gender"
              value="MALE"
              checked={gender === "MALE"}
              onChange={(e) => setGender(e.target.value)}
              className="w-4 h-4 text-[#0068ff] border-gray-300 focus:ring-[#0068ff]"
            />
            <span className="ml-2 text-sm text-gray-700">Nam</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="gender"
              value="FEMALE"
              checked={gender === "FEMALE"}
              onChange={(e) => setGender(e.target.value)}
              className="w-4 h-4 text-[#0068ff] border-gray-300 focus:ring-[#0068ff]"
            />
            <span className="ml-2 text-sm text-gray-700">Nữ</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="gender"
              value="OTHER"
              checked={gender === "OTHER"}
              onChange={(e) => setGender(e.target.value)}
              className="w-4 h-4 text-[#0068ff] border-gray-300 focus:ring-[#0068ff]"
            />
            <span className="ml-2 text-sm text-gray-700">Khác</span>
          </label>
        </div>
      </div>

      {/* Ảnh đại diện */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ảnh đại diện
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0068ff] file:text-white hover:file:bg-[#0056d6]"
        />
      </div>

      {/* Nút Submit / Cancel */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 px-6 py-2 bg-[#0068ff] text-white rounded-lg hover:bg-[#0056d6] transition-colors font-medium"
        >
          Lưu thay đổi
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Hủy bỏ
        </button>
      </div>
    </form>
  );
};

export default UpdateProfileForm;
